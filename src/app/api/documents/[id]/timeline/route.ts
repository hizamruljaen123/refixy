import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params as required in Next.js 15
    const { id } = await params

    // Check if document exists and user has permission
    const document = await db.document.findUnique({
      where: { id }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check read permissions
    const userRoles = session.user.roles as string[]
    const userPermissions = session.user.permissions as string[]
    
    const hasAccess = 
      userRoles.includes('ADMIN') ||
      document.owner_user_id === session.user.id ||
      document.visibility === 'PUBLIC' ||
      (document.visibility === 'INTERNAL' && userPermissions.includes('DOC_READ')) ||
      (session.user.units && session.user.units.some((unit: any) => unit.id === document.unit_id))

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const timeline = await db.documentTimeline.findMany({
      where: { document_id: id },
      orderBy: { event_at: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            full_name: true,
            email: true
          }
        },
        version: {
          select: {
            id: true,
            version_label: true
          }
        }
      }
    })

    return NextResponse.json({ timeline })
  } catch (error) {
    console.error('Error fetching document timeline:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params as required in Next.js 15
    const { id } = await params

    const body = await request.json()
    const { eventType, notes, versionId } = body

    // Check if document exists and user has permission
    const document = await db.document.findUnique({
      where: { id }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check write permissions
    const userRoles = session.user.roles as string[]
    const userPermissions = session.user.permissions as string[]
    
    const canEdit = 
      userRoles.includes('ADMIN') ||
      document.owner_user_id === session.user.id ||
      userPermissions.includes('DOC_WRITE')

    if (!canEdit) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate event type
    const validEventTypes = ['CREATED', 'UPLOADED', 'REVIEW_REQUESTED', 'APPROVED', 'PUBLISHED', 'ARCHIVED', 'EXPIRED', 'REPLACED']
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    // Create timeline event
    const timelineEvent = await db.documentTimeline.create({
      data: {
        document_id: id,
        version_id: versionId,
        event_type: eventType as any,
        actor_user_id: session.user.id,
        notes: notes || `${eventType} event`
      },
      include: {
        actor: {
          select: {
            id: true,
            full_name: true,
            email: true
          }
        },
        version: {
          select: {
            id: true,
            version_label: true
          }
        }
      }
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        actor_user_id: session.user.id,
        action: 'TIMELINE_EVENT',
        resource_type: 'DocumentTimeline',
        resource_id: timelineEvent.id,
        meta: JSON.stringify({ 
          documentId: id,
          eventType,
          notes
        })
      }
    })

    return NextResponse.json(timelineEvent, { status: 201 })
  } catch (error) {
    console.error('Error creating timeline event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
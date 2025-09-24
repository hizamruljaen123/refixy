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

    const canRead =
      userRoles.includes('ADMIN') ||
      document.owner_user_id === session.user.id ||
      document.visibility === 'PUBLIC' ||
      (document.visibility === 'INTERNAL' && userPermissions.includes('DOC_READ')) ||
      (session.user.units && session.user.units.some((unit: any) => unit.id === document.unit_id))

    if (!canRead) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const comments = await db.comment.findMany({
      where: { document_id: id },
      orderBy: { created_at: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            full_name: true
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

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Error fetching comments:', error)
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

    const canComment =
      userRoles.includes('ADMIN') ||
      document.owner_user_id === session.user.id ||
      document.visibility === 'PUBLIC' ||
      (document.visibility === 'INTERNAL' && userPermissions.includes('DOC_READ'))

    if (!canComment) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { content, version_id } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })
    }

    // If version_id is provided, check if it belongs to this document
    if (version_id) {
      const version = await db.documentVersion.findFirst({
        where: {
          id: version_id,
          document_id: id
        }
      })

      if (!version) {
        return NextResponse.json({ error: 'Invalid version ID' }, { status: 400 })
      }
    }

    const comment = await db.comment.create({
      data: {
        document_id: id,
        version_id: version_id || null,
        author_user_id: session.user.id,
        content: content.trim()
      },
      include: {
        author: {
          select: {
            id: true,
            full_name: true
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
        action: 'COMMENT_ADD',
        resource_type: 'Comment',
        resource_id: comment.id,
        meta: JSON.stringify({
          documentId: id,
          versionId: version_id,
          contentLength: content.length
        })
      }
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    const document = await db.document.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            full_name: true,
            email: true
          }
        },
        unit: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        current_version: {
          include: {
            creator: {
              select: {
                id: true,
                full_name: true
              }
            }
          }
        },
        versions: {
          orderBy: {
            created_at: 'desc'
          },
          include: {
            creator: {
              select: {
                id: true,
                full_name: true
              }
            }
          }
        },
        tags: {
          include: {
            tag: true
          }
        },
        timeline_events: {
          orderBy: {
            event_at: 'desc'
          },
          include: {
            actor: {
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
        }
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check access permissions
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

    // Create audit log for document view
    await db.auditLog.create({
      data: {
        actor_user_id: session.user.id,
        action: 'DOC_READ',
        resource_type: 'Document',
        resource_id: document.id,
        meta: JSON.stringify({ title: document.title })
      }
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    const {
      title,
      summary,
      category,
      classification,
      visibility,
      status,
      effective_date,
      expiry_date,
      tags
    } = body

    // Check if document exists and user has permission
    const existingDocument = await db.document.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            full_name: true
          }
        }
      }
    })

    if (!existingDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check write permissions
    const userRoles = session.user.roles as string[]
    const userPermissions = session.user.permissions as string[]
    
    const canEdit = 
      userRoles.includes('ADMIN') ||
      existingDocument.owner_user_id === session.user.id ||
      userPermissions.includes('DOC_WRITE')

    if (!canEdit) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Update document
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (summary !== undefined) updateData.summary = summary
    if (category !== undefined) updateData.category = category
    if (classification !== undefined) updateData.classification = classification
    if (visibility !== undefined) updateData.visibility = visibility
    if (status !== undefined) updateData.status = status
    if (effective_date !== undefined) updateData.effective_date = effective_date ? new Date(effective_date) : null
    if (expiry_date !== undefined) updateData.expiry_date = expiry_date ? new Date(expiry_date) : null

    if (tags !== undefined) {
      // Handle tags update
      await db.documentTag.deleteMany({
        where: { document_id: id }
      })

      if (tags.length > 0) {
        await db.documentTag.createMany({
          data: tags.map((tagId: string) => ({
            document_id: id,
            tag_id: tagId
          }))
        })
      }
    }

    const updatedDocument = await db.document.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            full_name: true,
            email: true
          }
        },
        unit: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        current_version: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    // Create timeline event for status change
    if (status && status !== existingDocument.status) {
      await db.documentTimeline.create({
        data: {
          document_id: id,
          event_type: status.toUpperCase() as any,
          actor_user_id: session.user.id,
          notes: `Status changed from ${existingDocument.status} to ${status}`
        }
      })
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        actor_user_id: session.user.id,
        action: 'DOC_UPDATE',
        resource_type: 'Document',
        resource_id: id,
        meta: JSON.stringify({ 
          title: updatedDocument.title,
          changes: Object.keys(updateData)
        })
      }
    })

    return NextResponse.json(updatedDocument)
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
    const existingDocument = await db.document.findUnique({
      where: { id }
    })

    if (!existingDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check delete permissions
    const userRoles = session.user.roles as string[]
    const userPermissions = session.user.permissions as string[]
    
    const canDelete = 
      userRoles.includes('ADMIN') ||
      (existingDocument.owner_user_id === session.user.id && userPermissions.includes('DOC_DELETE'))

    if (!canDelete) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Delete document (cascade will handle related records)
    await db.document.delete({
      where: { id }
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        actor_user_id: session.user.id,
        action: 'DOC_DELETE',
        resource_type: 'Document',
        resource_id: id,
        meta: JSON.stringify({ title: existingDocument.title })
      }
    })

    return NextResponse.json({ message: 'Document deleted successfully' })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
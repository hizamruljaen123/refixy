import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'
import { getDropboxUploader } from '@/lib/ftp'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params as required in Next.js 15
    const { id, versionId } = await params

    // Check if document exists and user has permission
    const document = await db.document.findUnique({
      where: { id },
      include: {
        versions: {
          where: { id: versionId },
          take: 1,
          include: {
            creator: {
              select: {
                id: true,
                full_name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!document || document.versions.length === 0) {
      return NextResponse.json({ error: 'Document or version not found' }, { status: 404 })
    }

    const version = document.versions[0]

    // Check read permissions
    const userRoles = session.user.roles as string[]
    const userPermissions = session.user.permissions as string[]

    const canRead =
      userRoles.includes('ADMIN') ||
      document.owner_user_id === session.user.id ||
      document.visibility === 'PUBLIC' ||
      (document.visibility === 'INTERNAL' && userRoles.length > 0) ||
      userPermissions.includes('DOC_READ')

    if (!canRead) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Return version details including file_path
    return NextResponse.json({
      id: version.id,
      version_label: version.version_label,
      change_type: version.change_type,
      change_log: version.change_log,
      file_path: version.file_path,
      file_hash: version.file_hash,
      file_mime: version.file_mime,
      file_size: version.file_size,
      created_at: version.created_at,
      created_by: version.creator
    })

  } catch (error) {
    console.error('Error getting version details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params as required in Next.js 15
    const { id, versionId } = await params

    // Check if user is super admin
    const userRoles = session.user.roles as string[]
    const userPermissions = session.user.permissions as string[]

    const isSuperAdmin = userRoles.includes('ADMIN') || userPermissions.includes('ADMIN')

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Only super admins can delete document versions' }, { status: 403 })
    }

    // Check if document and version exist
    const version = await (db as any).documentVersion.findUnique({
      where: { id: versionId },
      include: {
        document: true
      }
    })

    if (!version || version.document_id !== id) {
      return NextResponse.json({ error: 'Document version not found' }, { status: 404 })
    }

    // Check if it's the current version - prevent deletion of current version
    if (version.document.current_version_id === versionId) {
      return NextResponse.json({ error: 'Cannot delete the current active version. Change the current version first.' }, { status: 400 })
    }

    // Delete file from Dropbox if exists
    if (version.remote_path) {
      try {
        const uploader = await getDropboxUploader()
        const deleteSuccess = await uploader.deleteFile(version.remote_path)
        if (!deleteSuccess) {
          console.warn('Failed to delete file from Dropbox:', version.remote_path)
          // Continue with DB deletion even if file deletion fails
        }
      } catch (error) {
        console.error('Error deleting file from Dropbox:', error)
        // Continue with DB deletion
      }
    }

    // Delete related notifications and audit logs manually (they don't have FK)
    await db.notification.deleteMany({
      where: {
        payload: {
          contains: `"versionId":"${versionId}"`
        }
      }
    })

    await db.auditLog.deleteMany({
      where: {
        resource_type: 'DocumentVersion',
        resource_id: versionId
      }
    })

    // Delete the version - cascade will handle related records
    await db.documentVersion.delete({
      where: { id: versionId }
    })

    // Create audit log for version deletion
    await db.auditLog.create({
      data: {
        actor_user_id: session.user.id,
        action: 'DOC_VERSION_DELETE',
        resource_type: 'DocumentVersion',
        resource_id: versionId,
        meta: JSON.stringify({
          document_id: id,
          version_label: version.version_label,
          file_path: version.file_path
        })
      }
    })

    return NextResponse.json({ message: 'Document version deleted successfully' })

  } catch (error) {
    console.error('Error deleting version:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

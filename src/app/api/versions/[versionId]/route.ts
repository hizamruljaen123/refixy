import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: { versionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get document version
    const version = await db.documentVersion.findUnique({
      where: { id: params.versionId },
      include: {
        document: {
          include: {
            owner: {
              select: {
                id: true,
                full_name: true
              }
            },
            unit: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    // Check download permissions
    const userRoles = session.user.roles as string[]
    const userPermissions = session.user.permissions as string[]
    
    const canDownload = 
      userRoles.includes('ADMIN') ||
      version.document.owner_user_id === session.user.id ||
      version.document.visibility === 'PUBLIC' ||
      (version.document.visibility === 'INTERNAL' && userPermissions.includes('DOC_DOWNLOAD')) ||
      (session.user.units && session.user.units.some((unit: any) => unit.id === version.document.unit_id))

    if (!canDownload) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Read file
    const fileBuffer = await readFile(version.file_path)

    // Create audit log
    await db.auditLog.create({
      data: {
        actor_user_id: session.user.id,
        action: 'DOC_DOWNLOAD',
        resource_type: 'DocumentVersion',
        resource_id: version.id,
        meta: JSON.stringify({ 
          documentId: version.document_id,
          version: version.version_label,
          fileName: path.basename(version.file_path),
          fileSize: version.file_size
        })
      }
    })

    // Return file
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': version.file_mime || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${path.basename(version.file_path)}"`,
        'Content-Length': version.file_size?.toString() || fileBuffer.length.toString()
      }
    })
  } catch (error) {
    console.error('Error downloading document version:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
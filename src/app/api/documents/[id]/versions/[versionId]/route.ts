import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'

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

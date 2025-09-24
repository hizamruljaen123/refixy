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
          take: 1
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

    // Check if file exists
    const filePath = path.normalize(version.file_path)

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
    }

    // Read file and return as response
    const fileBuffer = fs.readFileSync(filePath)

    // Get MIME type based on file extension
    const ext = path.extname(version.file_path).toLowerCase()
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.rtf': 'application/rtf'
    }

    const mimeType = mimeTypes[ext] || 'application/octet-stream'

    // Return file as response
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${document.title}_v${version.version_label}${ext}"`,
        'Cache-Control': 'private, max-age=3600'
      }
    })

  } catch (error) {
    console.error('Error downloading version:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

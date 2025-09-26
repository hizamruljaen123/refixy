import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { dropboxUploader } from '@/lib/ftp'
import sharp from 'sharp'
import path from 'path'

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif'
])

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 80)
}

async function getDocumentForVersion(documentId: string, versionId: string) {
  return db.document.findUnique({
    where: { id: documentId },
    include: {
      versions: {
        where: { id: versionId },
        select: { id: true }
      }
    }
  })
}

function canRequestRevision(session: any, document: any) {
  const userRoles: string[] = session?.user?.roles || []
  const userPermissions: string[] = session?.user?.permissions || []
  const userId: string | undefined = session?.user?.id

  return (
    userRoles.includes('ADMIN') ||
    document.owner_user_id === userId ||
    userPermissions.includes('DOC_WRITE') ||
    userPermissions.includes('DOC_REVIEW')
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId, versionId } = await params
    const document = await getDocumentForVersion(documentId, versionId)

    if (!document || document.versions.length === 0) {
      return NextResponse.json({ error: 'Document or version not found' }, { status: 404 })
    }

    const userRoles: string[] = session.user.roles || []
    const userPermissions: string[] = session.user.permissions || []
    const hasAccess =
      userRoles.includes('ADMIN') ||
      document.owner_user_id === session.user.id ||
      document.visibility === 'PUBLIC' ||
      (document.visibility === 'INTERNAL' && userPermissions.includes('DOC_READ')) ||
      (session.user.units && session.user.units.some((unit: any) => unit.id === document.unit_id))

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const revisionRequests = await db.documentRevisionRequest.findMany({
      where: { version_id: versionId },
      orderBy: { created_at: 'desc' },
      include: {
        requester: {
          select: {
            id: true,
            full_name: true
          }
        },
        attachments: true
      }
    })

    return NextResponse.json({ revisionRequests })
  } catch (error) {
    console.error('Error fetching revision requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId, versionId } = await params
    const document = await getDocumentForVersion(documentId, versionId)

    if (!document || document.versions.length === 0) {
      return NextResponse.json({ error: 'Document or version not found' }, { status: 404 })
    }

    if (!canRequestRevision(session, document)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const formData = await request.formData()

    const notes = (formData.get('notes') as string | null)?.trim()
    const title = (formData.get('title') as string | null)?.trim() || null
    const requirements = (formData.get('requirements') as string | null)?.trim() || null

    if (!notes) {
      return NextResponse.json({ error: 'Revision notes are required' }, { status: 400 })
    }

    const attachments = formData.getAll('attachments').filter(Boolean) as File[]

    if (attachments.length > 5) {
      return NextResponse.json({ error: 'Maximum 5 images are allowed per revision request' }, { status: 400 })
    }

    const uploadResults = [] as Array<{
      file_url: string
      file_path: string
      file_name: string
      file_mime: string
      file_size: number
      image_width: number | null
      image_height: number | null
    }>

    for (const file of attachments) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return NextResponse.json({ error: `Unsupported image type: ${file.type}` }, { status: 400 })
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const image = sharp(buffer, { failOnError: false }).rotate()
      const metadata = await image.metadata()
      const compressedBuffer = await image
        .clone()
        .jpeg({ quality: 75, mozjpeg: true })
        .toBuffer()

      const timestamp = Date.now()
      const baseName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, '')) || 'attachment'
      const remotePath = `/revision_requests/${documentId}/${versionId}/${timestamp}_${baseName}.jpg`

      const fileUrl = await dropboxUploader.uploadBuffer(compressedBuffer, remotePath)

      uploadResults.push({
        file_url: fileUrl,
        file_path: remotePath,
        file_name: `${baseName}.jpg`,
        file_mime: 'image/jpeg',
        file_size: compressedBuffer.byteLength,
        image_width: metadata.width || null,
        image_height: metadata.height || null
      })
    }

    const revisionRequest = await db.documentRevisionRequest.create({
      data: {
        document_id: documentId,
        version_id: versionId,
        requester_user_id: session.user.id,
        title,
        notes,
        requirements,
        status: 'PROGRESS',
        attachments: {
          create: uploadResults.map((attachment) => ({
            file_url: attachment.file_url,
            file_path: attachment.file_path,
            file_name: attachment.file_name,
            file_mime: attachment.file_mime,
            file_size: attachment.file_size,
            image_width: attachment.image_width,
            image_height: attachment.image_height
          }))
        }
      },
      include: {
        requester: {
          select: {
            id: true,
            full_name: true
          }
        },
        attachments: true
      }
    })

    await db.documentTimeline.create({
      data: {
        document_id: documentId,
        version_id: versionId,
        event_type: 'REVIEW_REQUESTED',
        actor_user_id: session.user.id,
        notes: title ? `Revision requested: ${title}` : 'Revision requested'
      }
    })

    return NextResponse.json({ revisionRequest }, { status: 201 })
  } catch (error) {
    console.error('Error creating revision request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

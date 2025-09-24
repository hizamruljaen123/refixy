import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { DocumentTextExtractor, saveDocumentText, ExtractedText } from '@/lib/text-extraction'
import { ftpUploader } from '@/lib/ftp'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

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
      where: { id },
      include: {
        versions: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const changeType = (formData.get('change_type') as 'MAJOR' | 'MINOR') || 'MAJOR'
    const changeLog = (formData.get('change_log') as string) || 'File uploaded'

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, DOC, and DOCX files are allowed' },
        { status: 400 }
      )
    }

    // Generate version label
    const latestVersion = document.versions[0]
    let versionLabel = '1.0'

    if (latestVersion) {
      const [major, minor] = latestVersion.version_label.split('.').map(Number)
      if (changeType === 'MAJOR') {
        versionLabel = `${major + 1}.0`
      } else {
        versionLabel = `${major}.${minor + 1}`
      }
    }

    // Create upload directory based on date
    const now = new Date()
    const dateFolder = now.toISOString().split('T')[0] // YYYY-MM-DD format

    // Generate unique filename with timestamp and sanitized original name
    const timestamp = now.getTime()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_')
    const fileExtension = path.extname(file.name)
    const baseName = path.basename(sanitizedName, fileExtension)
    const fileName = `${timestamp}_${id}_${versionLabel}_${baseName}${fileExtension}`

    // Create remote path for Web Disk
    const remotePath = `aksesdata/${dateFolder}/${fileName}`

    // Convert file to buffer for hash and upload
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')

    // Create temp file for upload
    const tempFilePath = path.join(process.cwd(), 'tmp', `temp_${fileName}`)
    await writeFile(tempFilePath, fileBuffer)

    // Extract text content for FTS BEFORE uploading
    let extractedText: ExtractedText | null = null
    try {
      extractedText = await DocumentTextExtractor.extractFromFile(tempFilePath, file.type)
    } catch (error) {
      console.error('Error extracting text from document:', error)
      // Don't fail the upload if text extraction fails
    }

    // Upload to Web Disk
    const fileUrl = await ftpUploader.uploadFile(tempFilePath, remotePath)

    // Clean up temp file
    await unlink(tempFilePath)

    // Create document version
    const documentVersion = await db.documentVersion.create({
      data: {
        document_id: id,
        version_label: versionLabel,
        change_type: changeType,
        change_log: changeLog,
        file_path: fileUrl,
        file_hash: fileHash,
        file_mime: file.type,
        file_size: file.size,
        created_by: session.user.id
      },
      include: {
        creator: {
          select: {
            id: true,
            full_name: true
          }
        }
      }
    })

    // Save extracted text if any
    if (extractedText) {
      await saveDocumentText(documentVersion.id, extractedText)
    }

    // Update document's current version
    await db.document.update({
      where: { id },
      data: {
        current_version_id: documentVersion.id,
        updated_at: new Date()
      }
    })

    // Create timeline event
    await db.documentTimeline.create({
      data: {
        document_id: id,
        version_id: documentVersion.id,
        event_type: 'UPLOADED',
        actor_user_id: session.user.id,
        notes: `New version uploaded: ${versionLabel}`
      }
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        actor_user_id: session.user.id,
        action: 'DOC_UPLOAD',
        resource_type: 'DocumentVersion',
        resource_id: documentVersion.id,
        meta: JSON.stringify({ 
          documentId: id,
          version: versionLabel,
          fileName: fileName,
          originalFileName: file.name,
          fileSize: file.size,
          uploadDate: dateFolder,
          filePath: fileUrl
        })
      }
    })

    return NextResponse.json(documentVersion, { status: 201 })
  } catch (error) {
    console.error('Error uploading document version:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    const versions = await db.documentVersion.findMany({
      where: { document_id: id },
      orderBy: { created_at: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            full_name: true
          }
        }
      }
    })

    return NextResponse.json(versions)
  } catch (error) {
    console.error('Error fetching document versions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
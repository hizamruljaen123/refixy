import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const ALLOWED_STATUSES = ['DONE', 'POSTPONE', 'PROGRESS', 'DENIED'] as const

function canManageRevision(session: any, document: any) {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string; requestId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId, versionId, requestId } = await params
    const body = await request.json()
    const status = (body.status as string | undefined)?.toUpperCase()

    if (!status || !ALLOWED_STATUSES.includes(status as typeof ALLOWED_STATUSES[number])) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    const document = await getDocumentForVersion(documentId, versionId)

    if (!document || document.versions.length === 0) {
      return NextResponse.json({ error: 'Document or version not found' }, { status: 404 })
    }

    if (!canManageRevision(session, document)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const revisionRequest = await db.documentRevisionRequest.update({
      where: { id: requestId },
      data: { status },
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

    return NextResponse.json({ revisionRequest })
  } catch (error) {
    console.error('Error updating revision request status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

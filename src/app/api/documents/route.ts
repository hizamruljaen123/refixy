import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const visibility = searchParams.get('visibility')
    const fullText = searchParams.get('fullText') === 'true'

    // Build where clause based on filters and user permissions
    const where: any = {}

    // Apply status filter
    if (status && status !== 'all') {
      where.status = status
    }

    // Apply visibility filter based on user permissions
    if (visibility && visibility !== 'all') {
      where.visibility = visibility
    } else {
      // Default visibility filter based on user roles
      const userRoles = session.user.roles as string[]
      
      if (!userRoles.includes('ADMIN')) {
        // Non-admin users can only see documents they have access to
        where.OR = [
          { visibility: 'PUBLIC' },
          { visibility: 'INTERNAL' },
          { owner_user_id: session.user.id }
        ]
        
        // Add unit-based filtering if user has unit assignments
        if (session.user.units && session.user.units.length > 0) {
          const unitIds = session.user.units.map((unit: any) => unit.id)
          where.OR.push({ unit_id: { in: unitIds } })
        }
      }
    }

    let documents

    if (fullText && search) {
      // Use full-text search
      documents = await db.$queryRaw`
        SELECT DISTINCT 
          d.id,
          d.title,
          d.summary,
          d.category,
          d.classification,
          d.visibility,
          d.status,
          d.created_at,
          d.updated_at,
          d.effective_date,
          d.expiry_date,
          d.unit_id,
          d.owner_user_id,
          d.current_version_id,
          u.id as "owner_id",
          u.full_name as "owner_full_name",
          u.email as "owner_email",
          un.id as "unit_id",
          un.code as "unit_code",
          un.name as "unit_name",
          dv.id as "current_version_id",
          dv.version_label as "current_version_label",
          dv.file_size as "current_version_file_size",
          dv.created_at as "current_version_created_at"
        FROM documents d
        LEFT JOIN users u ON d.owner_user_id = u.id
        LEFT JOIN units un ON d.unit_id = un.id
        LEFT JOIN document_versions dv ON d.current_version_id = dv.id
        LEFT JOIN document_texts dt ON dv.id = dt.version_id
        LEFT JOIN document_texts_fts fts ON dt.version_id = fts.rowid
        WHERE 
          d.id IN (
            SELECT DISTINCT d2.id
            FROM documents d2
            LEFT JOIN document_versions dv2 ON d2.current_version_id = dv2.id
            LEFT JOIN document_texts dt2 ON dv2.id = dt2.version_id
            LEFT JOIN document_texts_fts fts2 ON dt2.version_id = fts2.rowid
            WHERE 
              (${Object.keys(where).length > 0} AND ${
                where.OR 
                  ? `(${where.OR.map((condition: any, index: number) => {
                      const conditions = []
                      if (condition.visibility) conditions.push(`d2.visibility = '${condition.visibility}'`)
                      if (condition.owner_user_id) conditions.push(`d2.owner_user_id = '${condition.owner_user_id}'`)
                      if (condition.unit_id) conditions.push(`d2.unit_id IN (${(condition.unit_id as any).in.map((id: string) => `'${id}'`).join(',')})`)
                      return conditions.join(' OR ')
                    }).join(' OR ')})`
                  : '1=1'
              })
              AND (fts2.document_texts_fts MATCH ${search} OR 
                   d2.title LIKE ${'%' + search + '%'} OR 
                   d2.summary LIKE ${'%' + search + '%'} OR 
                   d2.doc_number LIKE ${'%' + search + '%'} OR 
                   d2.category LIKE ${'%' + search + '%'})
          )
          ${status && status !== 'all' ? `AND d.status = '${status}'` : ''}
          ${visibility && visibility !== 'all' ? `AND d.visibility = '${visibility}'` : ''}
        ORDER BY d.updated_at DESC
      ` as any[]
    } else {
      // Use regular search
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
          { doc_number: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } }
        ]
      }

      documents = await db.document.findMany({
        where,
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
            select: {
              id: true,
              version_label: true,
              file_size: true,
              created_at: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          }
        },
        orderBy: {
          updated_at: 'desc'
        }
      })
    }

    // Format the results consistently
    const formattedDocuments = documents.map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      summary: doc.summary,
      category: doc.category,
      classification: doc.classification,
      visibility: doc.visibility,
      status: doc.status,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      effective_date: doc.effective_date,
      expiry_date: doc.expiry_date,
      owner: {
        id: doc.owner_id || doc.owner?.id,
        full_name: doc.owner_full_name || doc.owner?.full_name,
        email: doc.owner_email || doc.owner?.email
      },
      unit: {
        id: doc.unit_id || doc.unit?.id,
        code: doc.unit_code || doc.unit?.code,
        name: doc.unit_name || doc.unit?.name
      },
      current_version: doc.current_version_label ? {
        id: doc.current_version_id,
        version_label: doc.current_version_label,
        file_size: doc.current_version_file_size,
        created_at: doc.current_version_created_at
      } : (doc.current_version || null),
      tags: doc.tags || []
    }))

    return NextResponse.json({
      documents: formattedDocuments,
      total: formattedDocuments.length
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to create documents
    const userPermissions = session.user.permissions as string[]
    if (!userPermissions.includes('DOC_CREATE')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      summary,
      category,
      classification,
      visibility,
      unit_id,
      effective_date,
      expiry_date,
      tags
    } = body

    // Validate required fields
    if (!title || !unit_id) {
      return NextResponse.json(
        { error: 'Title and unit are required' },
        { status: 400 }
      )
    }

    // Check if the owner user exists (additional validation for production safety)
    const ownerUser = await db.user.findUnique({
      where: { id: session.user.id }
    })
    if (!ownerUser) {
      return NextResponse.json(
        { error: 'User not found in database. Please contact administrator.' },
        { status: 400 }
      )
    }

    // Check if unit exists
    const unitExists = await db.unit.findUnique({
      where: { id: unit_id }
    })
    if (!unitExists) {
      return NextResponse.json(
        { error: 'Invalid unit selected' },
        { status: 400 }
      )
    }

    // Create document
    const document = await db.document.create({
      data: {
        title,
        summary,
        category,
        classification: classification || 'LOW',
        visibility: visibility || 'INTERNAL',
        status: 'DRAFT',
        unit_id,
        owner_user_id: session.user.id,
        effective_date: effective_date ? new Date(effective_date) : null,
        expiry_date: expiry_date ? new Date(expiry_date) : null,
        tags: tags ? {
          connectOrCreate: tags.map((tagName: string) => ({
            where: { name: tagName },
            create: { name: tagName }
          }))
        } : undefined
      },
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
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    // Create timeline event
    await db.documentTimeline.create({
      data: {
        document_id: document.id,
        event_type: 'CREATED',
        actor_user_id: session.user.id,
        notes: 'Document created'
      }
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        actor_user_id: session.user.id,
        action: 'DOC_CREATE',
        resource_type: 'Document',
        resource_id: document.id,
        meta: JSON.stringify({ title: document.title })
      }
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
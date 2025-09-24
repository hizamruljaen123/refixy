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

    // Check if user has permission to view audit logs
    const userPermissions = session.user.permissions as string[]
    if (!userPermissions.includes('USER_MANAGE') && !userPermissions.includes('ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const action = searchParams.get('action')
    const resourceType = searchParams.get('resource_type')
    const userId = searchParams.get('user_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { resource_type: { contains: search, mode: 'insensitive' } },
        { meta: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (action) {
      where.action = { contains: action, mode: 'insensitive' }
    }

    if (resourceType) {
      where.resource_type = resourceType
    }

    if (userId) {
      where.actor_user_id = userId
    }

    if (dateFrom || dateTo) {
      where.at = {}
      if (dateFrom) where.at.gte = new Date(dateFrom)
      if (dateTo) where.at.lte = new Date(dateTo)
    }

    const logs = await db.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            full_name: true,
            email: true
          }
        }
      },
      orderBy: {
        at: 'desc'
      }
    })

    // Generate CSV
    const headers = [
      'Timestamp',
      'User',
      'User Email',
      'Action',
      'Resource Type',
      'Resource ID',
      'Metadata'
    ]

    const csvRows = [
      headers.join(','),
      ...logs.map(log => [
        log.at,
        log.actor?.full_name || '',
        log.actor?.email || '',
        log.action,
        log.resource_type || '',
        log.resource_id || '',
        `"${(log.meta || '').replace(/"/g, '""')}"`
      ].join(','))
    ]

    const csvContent = csvRows.join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Error exporting audit logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
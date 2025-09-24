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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search')
    const action = searchParams.get('action')
    const resourceType = searchParams.get('resource_type')
    const userId = searchParams.get('user_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    const skip = (page - 1) * limit

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

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
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
        },
        skip,
        take: limit
      }),
      db.auditLog.count({ where })
    ])

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
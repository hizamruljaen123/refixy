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

    // Check if user has admin permissions or analytics permissions
    const userRoles = session.user.roles as string[]
    if (!userRoles.includes('ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get total documents count
    const totalDocuments = await db.document.count()

    // Get documents by status
    const documentsByStatus = await db.document.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    })

    const statusMap = documentsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status
      return acc
    }, {} as Record<string, number>)

    // Get documents by classification
    const documentsByClassification = await db.document.groupBy({
      by: ['classification'],
      _count: {
        classification: true,
      },
    })

    const classificationMap = documentsByClassification.reduce((acc, item) => {
      acc[item.classification] = item._count.classification
      return acc
    }, {} as Record<string, number>)

    // Get documents by category
    const documentsByCategory = await db.document.groupBy({
      by: ['category'],
      _count: {
        category: true,
      },
      where: {
        category: {
          not: null,
        },
      },
    })

    const categoryMap = documentsByCategory.reduce((acc, item) => {
      acc[item.category!] = item._count.category
      return acc
    }, {} as Record<string, number>)

    // Get documents created over time (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const documentsCreatedOverTime = await db.$queryRaw<Array<{ date: string; count: number }>>`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM documents
      WHERE created_at >= ${thirtyDaysAgo.toISOString()}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `

    // Get user activity (documents created by each user)
    const userActivity = await db.document.groupBy({
      by: ['owner_user_id'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    })

    // Get user details for the activity data
    const userIds = userActivity.map(item => item.owner_user_id)
    const users = await db.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        full_name: true,
        updated_at: true,
      },
    })

    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user
      return acc
    }, {} as Record<string, { full_name: string; updated_at: Date }>)

    const userActivityData = userActivity.map(item => ({
      user: userMap[item.owner_user_id]?.full_name || 'Unknown',
      documentsCreated: item._count.id,
      lastActivity: userMap[item.owner_user_id]?.updated_at.toISOString() || '',
    }))

    const analyticsData = {
      totalDocuments,
      documentsByStatus: statusMap,
      documentsByClassification: classificationMap,
      documentsByCategory: categoryMap,
      documentsCreatedOverTime: documentsCreatedOverTime.map(item => ({
        date: item.date,
        count: Number(item.count),
      })),
      userActivity: userActivityData,
    }

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

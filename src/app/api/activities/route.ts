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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Check read permissions
    const userRoles = session.user.roles as string[]
    const userPermissions = session.user.permissions as string[]

    // Get timeline events with document and user info
    const timelineEvents = await db.documentTimeline.findMany({
      take: limit,
      skip: offset,
      orderBy: { event_at: 'desc' },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            status: true,
            visibility: true,
            unit_id: true,
            unit: {
              select: {
                name: true
              }
            }
          }
        },
        version: {
          select: {
            id: true,
            version_label: true
          }
        },
        actor: {
          select: {
            id: true,
            full_name: true
          }
        }
      }
    })

    // Filter based on user permissions
    const filteredEvents = timelineEvents.filter(event => {
      const canAccess = userRoles.includes('ADMIN') ||
        event.document.visibility === 'PUBLIC' ||
        (event.document.visibility === 'INTERNAL' && userPermissions.includes('DOC_READ')) ||
        (session.user.units && session.user.units.some((unit: any) => unit.id === event.document.unit_id)) ||
        event.actor_user_id === session.user.id

      return canAccess
    })

    // Get total count
    const totalCount = await db.documentTimeline.count()

    return NextResponse.json({
      activities: filteredEvents,
      total: totalCount,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

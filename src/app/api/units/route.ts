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

    const units = await db.unit.findMany({
      orderBy: {
        name: 'asc'
      },
      include: {
        _count: {
          select: {
            documents: true
          }
        }
      }
    })

    return NextResponse.json({
      units,
      total: units.length
    })
  } catch (error) {
    console.error('Error fetching units:', error)
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

    // Check if user has permission to manage units
    const userPermissions = session.user.permissions as string[]
    if (!userPermissions.includes('UNIT_MANAGE')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { code, name } = body

    // Validate required fields
    if (!code || !name) {
      return NextResponse.json(
        { error: 'Code and name are required' },
        { status: 400 }
      )
    }

    // Check if unit code already exists
    const existingUnit = await db.unit.findUnique({
      where: { code }
    })

    if (existingUnit) {
      return NextResponse.json(
        { error: 'Unit with this code already exists' },
        { status: 400 }
      )
    }

    // Create unit
    const unit = await db.unit.create({
      data: {
        code,
        name
      }
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        actor_user_id: session.user.id,
        action: 'UNIT_CREATE',
        resource_type: 'Unit',
        resource_id: unit.id,
        meta: JSON.stringify({ code: unit.code, name: unit.name })
      }
    })

    return NextResponse.json(unit, { status: 201 })
  } catch (error) {
    console.error('Error creating unit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
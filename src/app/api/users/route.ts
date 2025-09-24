import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage users
    const userPermissions = session.user.permissions as string[]
    if (!userPermissions.includes('USER_MANAGE') && !userPermissions.includes('ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        full_name: true,
        is_active: true,
        created_at: true,
        user_roles: {
          include: {
            role: {
              select: {
                name: true,
                description: true
              }
            },
            unit: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return NextResponse.json({
      users,
      total: users.length
    })
  } catch (error) {
    console.error('Error fetching users:', error)
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

    // Check if user has permission to manage users
    const userPermissions = session.user.permissions as string[]
    if (!userPermissions.includes('USER_MANAGE') && !userPermissions.includes('ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { email, full_name, password, role_ids, unit_id } = body

    // Validate required fields
    if (!email || !full_name || !password) {
      return NextResponse.json(
        { error: 'Email, full name, and password are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await db.user.create({
      data: {
        email,
        full_name,
        password_hash: hashedPassword,
        is_active: true
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        is_active: true,
        created_at: true
      }
    })

    // Assign roles if provided
    if (role_ids && role_ids.length > 0) {
      await db.userRole.createMany({
        data: role_ids.map((roleId: string) => ({
          user_id: user.id,
          role_id: roleId,
          unit_id: unit_id || null
        }))
      })
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        actor_user_id: session.user.id,
        action: 'USER_CREATE',
        resource_type: 'User',
        resource_id: user.id,
        meta: JSON.stringify({ email: user.email, full_name: user.full_name })
      }
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
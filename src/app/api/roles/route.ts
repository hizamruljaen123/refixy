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

    // Check if user has permission to manage roles
    const userPermissions = session.user.permissions as string[]
    if (!userPermissions.includes('ROLE_MANAGE') && !userPermissions.includes('ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const roles = await db.role.findMany({
      include: {
        role_permissions: {
          include: {
            permission: {
              select: {
                code: true,
                description: true
              }
            }
          }
        },
        _count: {
          select: {
            user_roles: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      roles,
      total: roles.length
    })
  } catch (error) {
    console.error('Error fetching roles:', error)
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

    // Check if user has permission to manage roles
    const userPermissions = session.user.permissions as string[]
    if (!userPermissions.includes('ROLE_MANAGE') && !userPermissions.includes('ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, permission_codes } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      )
    }

    // Check if role already exists
    const existingRole = await db.role.findUnique({
      where: { name }
    })

    if (existingRole) {
      return NextResponse.json(
        { error: 'Role with this name already exists' },
        { status: 400 }
      )
    }

    // Create role
    const role = await db.role.create({
      data: {
        name,
        description
      }
    })

    // Assign permissions if provided
    if (permission_codes && permission_codes.length > 0) {
      // Get permission IDs from codes
      const permissions = await db.permission.findMany({
        where: {
          code: { in: permission_codes }
        }
      })

      await db.rolePermission.createMany({
        data: permissions.map(permission => ({
          role_id: role.id,
          permission_id: permission.id
        }))
      })
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        actor_user_id: session.user.id,
        action: 'ROLE_CREATE',
        resource_type: 'Role',
        resource_id: role.id,
        meta: JSON.stringify({ name: role.name, description: role.description })
      }
    })

    return NextResponse.json(role, { status: 201 })
  } catch (error) {
    console.error('Error creating role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
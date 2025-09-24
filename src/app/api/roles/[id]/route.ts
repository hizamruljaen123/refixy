import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Await params as required in Next.js 15
    const { id } = await params

    const role = await db.role.findUnique({
      where: { id },
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
      }
    })

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    return NextResponse.json(role)
  } catch (error) {
    console.error('Error fetching role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Await params as required in Next.js 15
    const { id } = await params

    const body = await request.json()
    const { name, description, permission_codes } = body

    // Check if role exists
    const existingRole = await db.role.findUnique({
      where: { id }
    })

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Check if name is unique (excluding current role)
    if (name && name !== existingRole.name) {
      const duplicateRole = await db.role.findUnique({
        where: { name }
      })
      if (duplicateRole) {
        return NextResponse.json({ error: 'Role name already exists' }, { status: 400 })
      }
    }

    // Update role
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description

    const updatedRole = await db.role.update({
      where: { id },
      data: updateData
    })

    // Update permissions if provided
    if (permission_codes !== undefined) {
      // Remove existing permissions
      await db.rolePermission.deleteMany({
        where: { role_id: id }
      })

      // Add new permissions
      if (permission_codes.length > 0) {
        // Get permission IDs from codes
        const permissions = await db.permission.findMany({
          where: {
            code: { in: permission_codes }
          }
        })

        await db.rolePermission.createMany({
          data: permissions.map(permission => ({
            role_id: id,
            permission_id: permission.id
          }))
        })
      }
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        actor_user_id: session.user.id,
        action: 'ROLE_UPDATE',
        resource_type: 'Role',
        resource_id: updatedRole.id,
        meta: JSON.stringify({ name: updatedRole.name })
      }
    })

    return NextResponse.json(updatedRole)
  } catch (error) {
    console.error('Error updating role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Await params as required in Next.js 15
    const { id } = await params

    // Check if role exists
    const existingRole = await db.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            user_roles: true
          }
        }
      }
    })

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Prevent deletion of ADMIN role
    if (existingRole.name === 'ADMIN') {
      return NextResponse.json({ error: 'Cannot delete ADMIN role' }, { status: 400 })
    }

    // Check if role is still assigned to users
    if (existingRole._count.user_roles > 0) {
      return NextResponse.json(
        { error: 'Cannot delete role that is still assigned to users' },
        { status: 400 }
      )
    }

    // Delete role (cascade will handle related records)
    await db.role.delete({
      where: { id }
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        actor_user_id: session.user.id,
        action: 'ROLE_DELETE',
        resource_type: 'Role',
        resource_id: id,
        meta: JSON.stringify({ name: existingRole.name })
      }
    })

    return NextResponse.json({ message: 'Role deleted successfully' })
  } catch (error) {
    console.error('Error deleting role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

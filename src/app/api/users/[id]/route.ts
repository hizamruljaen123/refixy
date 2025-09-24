import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const user = await db.user.findUnique({
      where: { id: params.id },
      include: {
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
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
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

    // Check if user has permission to manage users
    const userPermissions = session.user.permissions as string[]
    if (!userPermissions.includes('USER_MANAGE') && !userPermissions.includes('ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { full_name, email, password, is_active, role_ids, unit_id } = body

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Build update data
    const updateData: any = {}
    if (full_name !== undefined) updateData.full_name = full_name
    if (email !== undefined) updateData.email = email
    if (is_active !== undefined) updateData.is_active = is_active

    // Hash password if provided
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 12)
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        full_name: true,
        is_active: true,
        updated_at: true
      }
    })

    // Update roles if provided
    if (role_ids !== undefined) {
      // Remove existing roles
      await db.userRole.deleteMany({
        where: { user_id: params.id }
      })

      // Add new roles
      if (role_ids.length > 0) {
        await db.userRole.createMany({
          data: role_ids.map((roleId: string) => ({
            user_id: params.id,
            role_id: roleId,
            unit_id: unit_id || null
          }))
        })
      }
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        actor_user_id: session.user.id,
        action: 'USER_UPDATE',
        resource_type: 'User',
        resource_id: params.id,
        meta: JSON.stringify({ 
          email: updatedUser.email, 
          full_name: updatedUser.full_name,
          changes: Object.keys(updateData)
        })
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user:', error)
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

    // Check if user has permission to manage users
    const userPermissions = session.user.permissions as string[]
    if (!userPermissions.includes('USER_MANAGE') && !userPermissions.includes('ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Don't allow deletion of the current user
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Delete user (cascade will handle related records)
    await db.user.delete({
      where: { id: params.id }
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        actor_user_id: session.user.id,
        action: 'USER_DELETE',
        resource_type: 'User',
        resource_id: params.id,
        meta: JSON.stringify({ email: existingUser.email, full_name: existingUser.full_name })
      }
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
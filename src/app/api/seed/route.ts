import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

async function seedDatabase() {
  // Create default roles
  const roles = await Promise.all([
    db.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: {
        name: 'ADMIN',
        description: 'System Administrator'
      }
    }),
    db.role.upsert({
      where: { name: 'EDITOR' },
      update: {},
      create: {
        name: 'EDITOR',
        description: 'Document Editor'
      }
    }),
    db.role.upsert({
      where: { name: 'REVIEWER' },
      update: {},
      create: {
        name: 'REVIEWER',
        description: 'Document Reviewer'
      }
    }),
    db.role.upsert({
      where: { name: 'APPROVER' },
      update: {},
      create: {
        name: 'APPROVER',
        description: 'Document Approver'
      }
    }),
    db.role.upsert({
      where: { name: 'VIEWER' },
      update: {},
      create: {
        name: 'VIEWER',
        description: 'Document Viewer'
      }
    })
  ])

  // Create default permissions
  const permissions = await Promise.all([
    db.permission.upsert({ where: { code: 'DOC_CREATE' }, update: {}, create: { code: 'DOC_CREATE', description: 'Create documents' } }),
    db.permission.upsert({ where: { code: 'DOC_READ' }, update: {}, create: { code: 'DOC_READ', description: 'Read documents' } }),
    db.permission.upsert({ where: { code: 'DOC_WRITE' }, update: {}, create: { code: 'DOC_WRITE', description: 'Write/Edit documents' } }),
    db.permission.upsert({ where: { code: 'DOC_DELETE' }, update: {}, create: { code: 'DOC_DELETE', description: 'Delete documents' } }),
    db.permission.upsert({ where: { code: 'DOC_APPROVE' }, update: {}, create: { code: 'DOC_APPROVE', description: 'Approve documents' } }),
    db.permission.upsert({ where: { code: 'DOC_REVIEW' }, update: {}, create: { code: 'DOC_REVIEW', description: 'Review documents' } }),
    db.permission.upsert({ where: { code: 'DOC_DOWNLOAD' }, update: {}, create: { code: 'DOC_DOWNLOAD', description: 'Download documents' } }),
    db.permission.upsert({ where: { code: 'USER_MANAGE' }, update: {}, create: { code: 'USER_MANAGE', description: 'Manage users' } }),
    db.permission.upsert({ where: { code: 'ROLE_MANAGE' }, update: {}, create: { code: 'ROLE_MANAGE', description: 'Manage roles' } }),
    db.permission.upsert({ where: { code: 'UNIT_MANAGE' }, update: {}, create: { code: 'UNIT_MANAGE', description: 'Manage units' } })
  ])

  // Assign permissions to roles
  const rolePermissions = [
    // ADMIN - all permissions
    ...roles.filter(r => r.name === 'ADMIN').flatMap(role =>
      permissions.map(permission => ({
        role_id: role.id,
        permission_id: permission.id
      }))
    ),
    // EDITOR
    ...roles.filter(r => r.name === 'EDITOR').flatMap(role =>
      permissions
        .filter(p => ['DOC_CREATE', 'DOC_READ', 'DOC_WRITE', 'DOC_DOWNLOAD'].includes(p.code))
        .map(permission => ({
          role_id: role.id,
          permission_id: permission.id
        }))
    ),
    // REVIEWER
    ...roles.filter(r => r.name === 'REVIEWER').flatMap(role =>
      permissions
        .filter(p => ['DOC_READ', 'DOC_REVIEW', 'DOC_DOWNLOAD'].includes(p.code))
        .map(permission => ({
          role_id: role.id,
          permission_id: permission.id
        }))
    ),
    // APPROVER
    ...roles.filter(r => r.name === 'APPROVER').flatMap(role =>
      permissions
        .filter(p => ['DOC_READ', 'DOC_APPROVE', 'DOC_DOWNLOAD'].includes(p.code))
        .map(permission => ({
          role_id: role.id,
          permission_id: permission.id
        }))
    ),
    // VIEWER
    ...roles.filter(r => r.name === 'VIEWER').flatMap(role =>
      permissions
        .filter(p => ['DOC_READ', 'DOC_DOWNLOAD'].includes(p.code))
        .map(permission => ({
          role_id: role.id,
          permission_id: permission.id
        }))
    )
  ]

  await db.rolePermission.createMany({
    data: rolePermissions,
    skipDuplicates: true
  })

  // Create default unit
  const unit = await db.unit.upsert({
    where: { code: 'DEFAULT' },
    update: {},
    create: {
      code: 'DEFAULT',
      name: 'Default Unit'
    }
  })

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  const adminUser = await db.user.upsert({
    where: { email: 'admin@dms.com' },
    update: {},
    create: {
      email: 'admin@dms.com',
      full_name: 'System Administrator',
      password_hash: hashedPassword,
      is_active: true
    }
  })

  // Assign admin role to admin user
  await db.userRole.upsert({
    where: {
      user_id_role_id: {
        user_id: adminUser.id,
        role_id: roles.find(r => r.name === 'ADMIN')!.id
      }
    },
    update: {},
    create: {
      user_id: adminUser.id,
      role_id: roles.find(r => r.name === 'ADMIN')!.id,
      unit_id: unit.id
    }
  })

  console.log('Database seeded successfully!')
  console.log('Admin user created:')
  console.log('Email: admin@dms.com')
  console.log('Password: admin123')

  return { success: true, message: 'Database seeded successfully' }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin users to seed
    const userPermissions = session.user.permissions as string[]
    if (!userPermissions.includes('ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions. Only admins can seed the database.' }, { status: 403 })
    }

    const result = await seedDatabase()

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error seeding database:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

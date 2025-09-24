import { db } from '../src/lib/db'
import bcrypt from 'bcryptjs'

async function main() {
  // Create default roles
  const roles = await Promise.all([
    db.role.create({
      data: {
        name: 'ADMIN',
        description: 'System Administrator'
      }
    }),
    db.role.create({
      data: {
        name: 'EDITOR',
        description: 'Document Editor'
      }
    }),
    db.role.create({
      data: {
        name: 'REVIEWER',
        description: 'Document Reviewer'
      }
    }),
    db.role.create({
      data: {
        name: 'APPROVER',
        description: 'Document Approver'
      }
    }),
    db.role.create({
      data: {
        name: 'VIEWER',
        description: 'Document Viewer'
      }
    })
  ])

  // Create default permissions
  const permissions = await Promise.all([
    db.permission.create({ data: { code: 'DOC_CREATE', description: 'Create documents' } }),
    db.permission.create({ data: { code: 'DOC_READ', description: 'Read documents' } }),
    db.permission.create({ data: { code: 'DOC_WRITE', description: 'Write/Edit documents' } }),
    db.permission.create({ data: { code: 'DOC_DELETE', description: 'Delete documents' } }),
    db.permission.create({ data: { code: 'DOC_APPROVE', description: 'Approve documents' } }),
    db.permission.create({ data: { code: 'DOC_REVIEW', description: 'Review documents' } }),
    db.permission.create({ data: { code: 'DOC_DOWNLOAD', description: 'Download documents' } }),
    db.permission.create({ data: { code: 'USER_MANAGE', description: 'Manage users' } }),
    db.permission.create({ data: { code: 'ROLE_MANAGE', description: 'Manage roles' } }),
    db.permission.create({ data: { code: 'UNIT_MANAGE', description: 'Manage units' } })
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
    data: rolePermissions
  })

  // Create default unit
  const unit = await db.unit.create({
    data: {
      code: 'DEFAULT',
      name: 'Default Unit'
    }
  })

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  const adminUser = await db.user.create({
    data: {
      email: 'admin@dms.com',
      full_name: 'System Administrator',
      password_hash: hashedPassword,
      is_active: true
    }
  })

  // Assign admin role to admin user
  await db.userRole.create({
    data: {
      user_id: adminUser.id,
      role_id: roles.find(r => r.name === 'ADMIN')!.id,
      unit_id: unit.id
    }
  })

  console.log('Database seeded successfully!')
  console.log('Admin user created:')
  console.log('Email: admin@dms.com')
  console.log('Password: admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
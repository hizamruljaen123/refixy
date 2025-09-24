import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function exportDataToSQL() {
  const sqlStatements: string[] = []

  try {
    console.log('Exporting data to SQL...')

    // Export roles
    const roles = await prisma.role.findMany()
    roles.forEach(role => {
      sqlStatements.push(`INSERT INTO "roles" ("id", "name", "description") VALUES ('${role.id}', '${role.name}', ${role.description ? `'${role.description.replace(/'/g, "''")}'` : 'NULL'}) ON CONFLICT ("id") DO NOTHING;`)
    })

    // Export permissions
    const permissions = await prisma.permission.findMany()
    permissions.forEach(permission => {
      sqlStatements.push(`INSERT INTO "permissions" ("id", "code", "description") VALUES ('${permission.id}', '${permission.code}', ${permission.description ? `'${permission.description.replace(/'/g, "''")}'` : 'NULL'}) ON CONFLICT ("id") DO NOTHING;`)
    })

    // Export role_permissions
    const rolePermissions = await prisma.rolePermission.findMany()
    rolePermissions.forEach(rp => {
      sqlStatements.push(`INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('${rp.role_id}', '${rp.permission_id}') ON CONFLICT ("role_id", "permission_id") DO NOTHING;`)
    })

    // Export units
    const units = await prisma.unit.findMany()
    units.forEach(unit => {
      sqlStatements.push(`INSERT INTO "units" ("id", "code", "name") VALUES ('${unit.id}', '${unit.code}', '${unit.name}') ON CONFLICT ("id") DO NOTHING;`)
    })

    // Export users
    const users = await prisma.user.findMany()
    users.forEach(user => {
      sqlStatements.push(`INSERT INTO "users" ("id", "email", "full_name", "password_hash", "is_active", "created_at", "updated_at") VALUES ('${user.id}', '${user.email}', '${user.full_name.replace(/'/g, "''")}', '${user.password_hash}', ${user.is_active}, '${user.created_at.toISOString()}', '${user.updated_at.toISOString()}') ON CONFLICT ("id") DO NOTHING;`)
    })

    // Export user_roles
    const userRoles = await prisma.userRole.findMany()
    userRoles.forEach(ur => {
      sqlStatements.push(`INSERT INTO "user_roles" ("user_id", "role_id", "unit_id") VALUES ('${ur.user_id}', '${ur.role_id}', ${ur.unit_id ? `'${ur.unit_id}'` : 'NULL'}) ON CONFLICT ("user_id", "role_id") DO NOTHING;`)
    })

    // Export tags
    const tags = await prisma.tag.findMany()
    tags.forEach(tag => {
      sqlStatements.push(`INSERT INTO "tags" ("id", "name") VALUES ('${tag.id}', '${tag.name}') ON CONFLICT ("id") DO NOTHING;`)
    })

    // Export documents
    const documents = await prisma.document.findMany()
    documents.forEach(doc => {
      sqlStatements.push(`INSERT INTO "documents" ("id", "doc_number", "title", "summary", "category", "classification", "visibility", "status", "unit_id", "owner_user_id", "current_version_id", "created_at", "updated_at", "effective_date", "expiry_date") VALUES ('${doc.id}', ${doc.doc_number ? `'${doc.doc_number}'` : 'NULL'}, '${doc.title.replace(/'/g, "''")}', ${doc.summary ? `'${doc.summary.replace(/'/g, "''")}'` : 'NULL'}, ${doc.category ? `'${doc.category}'` : 'NULL'}, '${doc.classification}', '${doc.visibility}', '${doc.status}', '${doc.unit_id}', '${doc.owner_user_id}', ${doc.current_version_id ? `'${doc.current_version_id}'` : 'NULL'}, '${doc.created_at.toISOString()}', '${doc.updated_at.toISOString()}', ${doc.effective_date ? `'${doc.effective_date.toISOString()}'` : 'NULL'}, ${doc.expiry_date ? `'${doc.expiry_date.toISOString()}'` : 'NULL'}) ON CONFLICT ("id") DO NOTHING;`)
    })

    // Export document_versions
    const documentVersions = await prisma.documentVersion.findMany()
    documentVersions.forEach(dv => {
      sqlStatements.push(`INSERT INTO "document_versions" ("id", "document_id", "version_label", "change_type", "change_log", "file_path", "file_hash", "file_mime", "file_size", "created_by", "created_at", "is_published") VALUES ('${dv.id}', '${dv.document_id}', '${dv.version_label}', '${dv.change_type}', ${dv.change_log ? `'${dv.change_log.replace(/'/g, "''")}'` : 'NULL'}, '${dv.file_path}', '${dv.file_hash}', ${dv.file_mime ? `'${dv.file_mime}'` : 'NULL'}, ${dv.file_size || 'NULL'}, '${dv.created_by}', '${dv.created_at.toISOString()}', ${dv.is_published}) ON CONFLICT ("id") DO NOTHING;`)
    })

    // Export document_texts
    const documentTexts = await prisma.documentText.findMany()
    documentTexts.forEach(dt => {
      sqlStatements.push(`INSERT INTO "document_texts" ("version_id", "content") VALUES ('${dt.version_id}', '${dt.content.replace(/'/g, "''")}') ON CONFLICT ("version_id") DO NOTHING;`)
    })

    // Export document_tags
    const documentTags = await prisma.documentTag.findMany()
    documentTags.forEach(dt => {
      sqlStatements.push(`INSERT INTO "document_tags" ("document_id", "tag_id") VALUES ('${dt.document_id}', '${dt.tag_id}') ON CONFLICT ("document_id", "tag_id") DO NOTHING;`)
    })

    // Export document_acls
    const documentAcls = await prisma.documentACL.findMany()
    documentAcls.forEach(acl => {
      sqlStatements.push(`INSERT INTO "document_acls" ("id", "document_id", "subject_type", "subject_id", "access", "created_at") VALUES ('${acl.id}', '${acl.document_id}', '${acl.subject_type}', '${acl.subject_id}', '${acl.access}', '${acl.created_at.toISOString()}') ON CONFLICT ("id") DO NOTHING;`)
    })

    // Export document_timeline
    const documentTimeline = await prisma.documentTimeline.findMany()
    documentTimeline.forEach(tl => {
      sqlStatements.push(`INSERT INTO "document_timeline" ("id", "document_id", "version_id", "event_type", "actor_user_id", "event_at", "notes") VALUES ('${tl.id}', '${tl.document_id}', ${tl.version_id ? `'${tl.version_id}'` : 'NULL'}, '${tl.event_type}', '${tl.actor_user_id}', '${tl.event_at.toISOString()}', ${tl.notes ? `'${tl.notes.replace(/'/g, "''")}'` : 'NULL'}) ON CONFLICT ("id") DO NOTHING;`)
    })

    // Export audit_logs
    const auditLogs = await prisma.auditLog.findMany()
    auditLogs.forEach(log => {
      sqlStatements.push(`INSERT INTO "audit_logs" ("id", "actor_user_id", "action", "resource_type", "resource_id", "at", "meta") VALUES ('${log.id}', ${log.actor_user_id ? `'${log.actor_user_id}'` : 'NULL'}, '${log.action}', ${log.resource_type ? `'${log.resource_type}'` : 'NULL'}, ${log.resource_id ? `'${log.resource_id}'` : 'NULL'}, '${log.at.toISOString()}', ${log.meta ? `'${log.meta.replace(/'/g, "''")}'` : 'NULL'}) ON CONFLICT ("id") DO NOTHING;`)
    })

    // Export comments
    const comments = await prisma.comment.findMany()
    comments.forEach(comment => {
      sqlStatements.push(`INSERT INTO "comments" ("id", "document_id", "version_id", "author_user_id", "content", "created_at") VALUES ('${comment.id}', '${comment.document_id}', ${comment.version_id ? `'${comment.version_id}'` : 'NULL'}, '${comment.author_user_id}', '${comment.content.replace(/'/g, "''")}', '${comment.created_at.toISOString()}') ON CONFLICT ("id") DO NOTHING;`)
    })

    // Export notifications
    const notifications = await prisma.notification.findMany()
    notifications.forEach(notif => {
      sqlStatements.push(`INSERT INTO "notifications" ("id", "user_id", "type", "payload", "is_read", "created_at") VALUES ('${notif.id}', '${notif.user_id}', '${notif.type}', ${notif.payload ? `'${notif.payload.replace(/'/g, "''")}'` : 'NULL'}, ${notif.is_read}, '${notif.created_at.toISOString()}') ON CONFLICT ("id") DO NOTHING;`)
    })

    // Write to file
    const outputPath = path.join(__dirname, '../../database_export.sql')
    fs.writeFileSync(outputPath, sqlStatements.join('\n\n') + '\n')

    console.log(`Data exported to ${outputPath}`)
    console.log(`Total statements: ${sqlStatements.length}`)

  } catch (error) {
    console.error('Error exporting data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

exportDataToSQL()

INSERT INTO "roles" ("id", "name", "description") VALUES ('cmfyhiypg0000uar4uctp6v5m', 'ADMIN', 'System Administrator') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "roles" ("id", "name", "description") VALUES ('cmfyhj0a50001uar4dzynpxhv', 'APPROVER', 'Document Approver') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "roles" ("id", "name", "description") VALUES ('cmfyhj0ah0002uar46ojvn5xw', 'VIEWER', 'Document Viewer') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "roles" ("id", "name", "description") VALUES ('cmfyhj0ck0003uar4e46w093l', 'REVIEWER', 'Document Reviewer') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "roles" ("id", "name", "description") VALUES ('cmfyhj0cy0004uar4309hc6fo', 'EDITOR', 'Document Editor') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "permissions" ("id", "code", "description") VALUES ('cmfyhj0tq0009uar48rwhvw91', 'DOC_REVIEW', 'Review documents') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "permissions" ("id", "code", "description") VALUES ('cmfyhj0tq0006uar4f0bggnaq', 'DOC_DELETE', 'Delete documents') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "permissions" ("id", "code", "description") VALUES ('cmfyhj0tq0008uar45fu4gqn2', 'DOC_DOWNLOAD', 'Download documents') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "permissions" ("id", "code", "description") VALUES ('cmfyhj0tq0007uar4l5muyc6l', 'DOC_CREATE', 'Create documents') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "permissions" ("id", "code", "description") VALUES ('cmfyhj0tq0005uar45p1t7im0', 'DOC_READ', 'Read documents') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "permissions" ("id", "code", "description") VALUES ('cmfyhj2d6000auar4fomhns8z', 'DOC_APPROVE', 'Approve documents') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "permissions" ("id", "code", "description") VALUES ('cmfyhj2dd000buar4t13z3aac', 'USER_MANAGE', 'Manage users') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "permissions" ("id", "code", "description") VALUES ('cmfyhj2f6000cuar4pv7gz8ur', 'UNIT_MANAGE', 'Manage units') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "permissions" ("id", "code", "description") VALUES ('cmfyhj2fj000duar48hwi1mny', 'ROLE_MANAGE', 'Manage roles') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "permissions" ("id", "code", "description") VALUES ('cmfyhj2g8000euar4fflew9lk', 'DOC_WRITE', 'Write/Edit documents') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhiypg0000uar4uctp6v5m', 'cmfyhj0tq0007uar4l5muyc6l') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhiypg0000uar4uctp6v5m', 'cmfyhj0tq0005uar45p1t7im0') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhiypg0000uar4uctp6v5m', 'cmfyhj2g8000euar4fflew9lk') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhiypg0000uar4uctp6v5m', 'cmfyhj0tq0006uar4f0bggnaq') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhiypg0000uar4uctp6v5m', 'cmfyhj2d6000auar4fomhns8z') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhiypg0000uar4uctp6v5m', 'cmfyhj0tq0009uar48rwhvw91') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhiypg0000uar4uctp6v5m', 'cmfyhj0tq0008uar45fu4gqn2') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhiypg0000uar4uctp6v5m', 'cmfyhj2dd000buar4t13z3aac') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhiypg0000uar4uctp6v5m', 'cmfyhj2fj000duar48hwi1mny') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhiypg0000uar4uctp6v5m', 'cmfyhj2f6000cuar4pv7gz8ur') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhj0cy0004uar4309hc6fo', 'cmfyhj0tq0007uar4l5muyc6l') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhj0cy0004uar4309hc6fo', 'cmfyhj0tq0005uar45p1t7im0') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhj0cy0004uar4309hc6fo', 'cmfyhj2g8000euar4fflew9lk') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhj0cy0004uar4309hc6fo', 'cmfyhj0tq0008uar45fu4gqn2') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhj0ck0003uar4e46w093l', 'cmfyhj0tq0005uar45p1t7im0') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhj0ck0003uar4e46w093l', 'cmfyhj0tq0009uar48rwhvw91') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhj0ck0003uar4e46w093l', 'cmfyhj0tq0008uar45fu4gqn2') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhj0a50001uar4dzynpxhv', 'cmfyhj0tq0005uar45p1t7im0') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhj0a50001uar4dzynpxhv', 'cmfyhj2d6000auar4fomhns8z') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhj0a50001uar4dzynpxhv', 'cmfyhj0tq0008uar45fu4gqn2') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhj0ah0002uar46ojvn5xw', 'cmfyhj0tq0005uar45p1t7im0') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ('cmfyhj0ah0002uar46ojvn5xw', 'cmfyhj0tq0008uar45fu4gqn2') ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "units" ("id", "code", "name") VALUES ('cmfyhj3vc000fuar4g7usq4nw', 'DEFAULT', 'Default Unit') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "users" ("id", "email", "full_name", "password_hash", "is_active", "created_at", "updated_at") VALUES ('cmfyhj4j1000guar4cbdzwpu3', 'admin@dms.com', 'System Administrator', '$2b$12$Z/RLcnjHOryr5ZkwqvqiX.J0fxUdZWu2Kzapy6FNzqSQAus4M9gqO', true, '2025-09-24T21:17:20.941Z', '2025-09-24T21:17:20.941Z') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "user_roles" ("user_id", "role_id", "unit_id") VALUES ('cmfyhj4j1000guar4cbdzwpu3', 'cmfyhiypg0000uar4uctp6v5m', 'cmfyhj3vc000fuar4g7usq4nw') ON CONFLICT ("user_id", "role_id") DO NOTHING;

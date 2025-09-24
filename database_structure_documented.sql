-- ================================================================
-- DATABASE SCHEMA DOCUMENTATION
-- Document Management System (DMS) Database Structure
-- Generated from: D:\new_project\dokuman_DMS\db\custom.db
-- ================================================================

-- ================================================================
-- USER MANAGEMENT TABLES
-- ================================================================

-- Users table - stores user account information
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Roles table - defines system roles
CREATE TABLE IF NOT EXISTS "roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- User roles mapping - assigns roles to users per unit
CREATE TABLE IF NOT EXISTS "user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "unit_id" TEXT,

    PRIMARY KEY ("user_id", "role_id"),
    CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_roles_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "user_roles_user_id_role_id_unit_id_key" ON "user_roles"("user_id", "role_id", "unit_id");

-- ================================================================
-- PERMISSION SYSTEM
-- ================================================================

-- Permissions table - defines available permissions
CREATE TABLE IF NOT EXISTS "permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "description" TEXT
);
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- Role permissions mapping - assigns permissions to roles
CREATE TABLE IF NOT EXISTS "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    PRIMARY KEY ("role_id", "permission_id"),
    CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ================================================================
-- ORGANIZATIONAL STRUCTURE
-- ================================================================

-- Units table - organizational units/departments
CREATE TABLE IF NOT EXISTS "units" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL
);
CREATE UNIQUE INDEX "units_code_key" ON "units"("code");

-- ================================================================
-- DOCUMENT MANAGEMENT
-- ================================================================

-- Documents table - main document metadata
CREATE TABLE IF NOT EXISTS "documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "doc_number" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "category" TEXT,
    "classification" TEXT NOT NULL DEFAULT 'LOW',      -- Security classification
    "visibility" TEXT NOT NULL DEFAULT 'INTERNAL',    -- Visibility level
    "status" TEXT NOT NULL DEFAULT 'DRAFT',           -- Document status
    "unit_id" TEXT NOT NULL,                          -- Owning unit
    "owner_user_id" TEXT NOT NULL,                    -- Document owner
    "current_version_id" TEXT,                        -- Current active version
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "effective_date" DATETIME,                        -- When document becomes effective
    "expiry_date" DATETIME,                          -- When document expires
    CONSTRAINT "documents_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "documents_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "documents_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "document_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "documents_current_version_id_key" ON "documents"("current_version_id");

-- Document versions - version control for documents
CREATE TABLE IF NOT EXISTS "document_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "version_label" TEXT NOT NULL,                    -- Version number/label
    "change_type" TEXT NOT NULL,                      -- Type of change made
    "change_log" TEXT,                               -- Description of changes
    "file_path" TEXT NOT NULL,                       -- Path to file storage
    "file_hash" TEXT NOT NULL,                       -- File integrity hash
    "file_mime" TEXT,                               -- MIME type
    "file_size" INTEGER,                            -- File size in bytes
    "created_by" TEXT NOT NULL,                     -- User who created version
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_published" BOOLEAN NOT NULL DEFAULT false,  -- Publication status
    CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "document_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Document text content - extracted text for search
CREATE TABLE IF NOT EXISTS "document_texts" (
    "version_id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,                         -- Full text content
    CONSTRAINT "document_texts_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "document_versions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ================================================================
-- TAGGING SYSTEM
-- ================================================================

-- Tags table - document tags
CREATE TABLE IF NOT EXISTS "tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- Document tags mapping
CREATE TABLE IF NOT EXISTS "document_tags" (
    "document_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    PRIMARY KEY ("document_id", "tag_id"),
    CONSTRAINT "document_tags_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "document_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ================================================================
-- ACCESS CONTROL
-- ================================================================

-- Document access control list
CREATE TABLE IF NOT EXISTS "document_acls" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,                    -- Type of subject (user, unit, etc.)
    "subject_id" TEXT NOT NULL,                      -- ID of subject
    "access" TEXT NOT NULL,                          -- Access level granted
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_acls_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "document_acls_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "units" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ================================================================
-- AUDIT AND TRACKING
-- ================================================================

-- Document timeline - tracks document events
CREATE TABLE IF NOT EXISTS "document_timeline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "version_id" TEXT,                               -- Related version (if applicable)
    "event_type" TEXT NOT NULL,                      -- Type of event
    "actor_user_id" TEXT NOT NULL,                   -- User who performed action
    "event_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,                                    -- Additional notes
    CONSTRAINT "document_timeline_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "document_timeline_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "document_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "document_timeline_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Audit logs - system-wide audit trail
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor_user_id" TEXT,                           -- User who performed action
    "action" TEXT NOT NULL,                         -- Action performed
    "resource_type" TEXT,                           -- Type of resource affected
    "resource_id" TEXT,                            -- ID of resource affected
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" TEXT,                                   -- Additional metadata (JSON)
    CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ================================================================
-- COLLABORATION FEATURES
-- ================================================================

-- Comments - document comments and discussions
CREATE TABLE IF NOT EXISTS "comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "version_id" TEXT,                              -- Specific version (if applicable)
    "author_user_id" TEXT NOT NULL,                 -- Comment author
    "content" TEXT NOT NULL,                        -- Comment content
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comments_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "comments_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "document_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Notifications - user notifications
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,                        -- Target user
    "type" TEXT NOT NULL,                           -- Notification type
    "payload" TEXT,                                 -- Notification data (JSON)
    "is_read" BOOLEAN NOT NULL DEFAULT false,       -- Read status
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ================================================================
-- END OF SCHEMA
-- ================================================================
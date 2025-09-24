# Database Structure Summary - Document Management System

## Overview
Database SQLite yang berisi struktur untuk sistem manajemen dokumen dengan fitur user management, version control, access control, dan audit trail.

**Database Path:** `D:\new_project\dokuman_DMS\db\custom.db`

## Table Summary (15 Tables)

### 👥 User Management (3 tables)
- **`users`** - Data pengguna sistem (email, nama, password, status aktif)
- **`roles`** - Definisi role/peran dalam sistem
- **`user_roles`** - Mapping antara user dan role per unit

### 🔐 Permission System (2 tables)  
- **`permissions`** - Definisi permission/izin yang tersedia
- **`role_permissions`** - Mapping antara role dan permission

### 🏢 Organizational Structure (1 table)
- **`units`** - Unit/departemen organisasi

### 📄 Document Management (4 tables)
- **`documents`** - Metadata utama dokumen (judul, status, klasifikasi, dll)
- **`document_versions`** - Version control untuk dokumen
- **`document_texts`** - Konten teks dokumen untuk pencarian
- **`document_tags`** - Mapping antara dokumen dan tag

### 🏷️ Tagging System (1 table)
- **`tags`** - Tag untuk kategorisasi dokumen

### 🔒 Access Control (1 table)
- **`document_acls`** - Access Control List untuk dokumen

### 📊 Audit & Tracking (2 tables)
- **`document_timeline`** - Timeline event/aktivitas dokumen
- **`audit_logs`** - Log audit sistem secara keseluruhan

### 🤝 Collaboration Features (2 tables)
- **`comments`** - Komentar pada dokumen
- **`notifications`** - Notifikasi untuk pengguna

## Key Features Detected

### 🔐 Security Features
- Password hashing untuk user
- Role-based access control (RBAC)
- Document classification levels
- Access control lists (ACL)
- Comprehensive audit logging

### 📋 Document Management Features
- Version control dengan changelog
- Document status tracking (DRAFT, dll)
- File integrity dengan hash
- Document lifecycle (effective/expiry dates)
- Text extraction untuk pencarian

### 👥 Multi-tenancy Support
- Unit/organizational structure
- User roles per unit
- Document ownership by unit

### 🔍 Search & Discovery
- Document tagging system
- Full-text content storage
- Multiple search vectors

### 📈 Audit & Compliance
- Complete document timeline
- System-wide audit logs
- Change tracking
- User activity monitoring

## Database Relationships

```
users ←→ user_roles ←→ roles ←→ role_permissions ←→ permissions
  ↓           ↓
documents ←→ units
  ↓
document_versions ←→ document_texts
  ↓
document_timeline

documents ←→ document_tags ←→ tags
documents ←→ document_acls
documents ←→ comments
```

## Files Generated
1. **`database_schema.sql`** - Raw schema export
2. **`database_structure_documented.sql`** - Documented schema with comments
3. **`database_tables_summary.md`** - This summary file

## Usage
Gunakan file SQL untuk:
- Recreate database structure
- Understand data relationships
- Database migration reference
- Development documentation
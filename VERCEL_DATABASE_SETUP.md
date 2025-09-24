# Panduan Setup Prisma Database di Vercel

## Langkah yang sudah dilakukan:
✅ Mengubah Prisma schema dari SQLite ke PostgreSQL
✅ Install PostgreSQL driver (pg)
✅ Setup NEXTAUTH_SECRET di Vercel
✅ Setup placeholder DATABASE_URL di Vercel

## Langkah selanjutnya:

### 1. Setup Database Cloud (Pilih salah satu):

#### Opsi A: Neon (Recommended - GRATIS)
```bash
# 1. Buka https://neon.tech
# 2. Sign up dengan GitHub
# 3. Create new project
# 4. Copy connection string
```

#### Opsi B: Supabase (GRATIS)
```bash
# 1. Buka https://supabase.com  
# 2. Sign up dengan GitHub
# 3. Create new project
# 4. Go to Settings > Database > Connection string > URI
```

#### Opsi C: Railway (GRATIS trial)
```bash
# 1. Buka https://railway.app
# 2. Sign up dengan GitHub  
# 3. New Project > Add PostgreSQL
# 4. Copy DATABASE_URL dari Variables
```

### 2. Update DATABASE_URL di Vercel:
```bash
# Setelah dapat connection string dari database cloud:
vercel env add DATABASE_URL
# Paste connection string yang didapat dari step 1
# Pilih: Production

# Contoh format:
# postgresql://username:password@host:port/database_name?sslmode=require
```

### 3. Generate Prisma Client dan Push Schema:
```bash
# Generate client untuk production
npx prisma generate

# Push schema ke database (create tables)
npx prisma db push
```

### 4. Seed Database (Optional):
```bash
# Jika ada seed data
npm run db:seed
```

### 5. Deploy ke Vercel:
```bash
vercel --prod
```

### 6. Verify Deployment:
```bash
# Check environment variables
vercel env ls

# Check logs jika ada error
vercel logs [deployment-url]
```

## Troubleshooting:

### Error: "Environment variable not found: DATABASE_URL"
- Pastikan DATABASE_URL sudah ditambahkan ke Vercel environment variables
- Run: `vercel env ls` untuk verify

### Error: "Can't reach database server"  
- Pastikan connection string benar
- Pastikan database cloud sudah running
- Check firewall/whitelist settings di database provider

### Error: "Table doesn't exist"
- Run: `npx prisma db push` untuk create tables
- Atau run: `npx prisma migrate deploy` jika ada migrations

### Build Error: "Prisma Client not found"
- Pastikan build script sudah include `prisma generate`
- Current build script: `"build": "prisma generate && next build"`

## Environment Variables yang dibutuhkan:
```
DATABASE_URL="postgresql://..." # dari database cloud
NEXTAUTH_SECRET="..." # sudah di-set
NEXTAUTH_URL="https://your-app.vercel.app" # auto-set oleh Vercel
```
# Setup Database PostgreSQL untuk Vercel

## Pilihan 1: Neon (Recommended) - GRATIS
1. Kunjungi https://neon.tech
2. Sign up dengan GitHub account
3. Create new project
4. Copy connection string yang diberikan

## Pilihan 2: Supabase - GRATIS  
1. Kunjungi https://supabase.com
2. Sign up dengan GitHub account
3. Create new project
4. Go to Settings > Database
5. Copy connection string

## Pilihan 3: Railway - GRATIS (trial)
1. Kunjungi https://railway.app
2. Sign up dengan GitHub account
3. Create new project > Add PostgreSQL
4. Copy connection string dari Variables tab

## Format DATABASE_URL:
```
postgresql://username:password@host:port/database_name?sslmode=require
```

## Setelah mendapat DATABASE_URL:
1. Add ke Vercel environment variables
2. Run `prisma db push` untuk create tables
3. Run `npm run db:seed` untuk insert data awal
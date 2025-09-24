# Script untuk setup database setelah mendapat DATABASE_URL

# Step 1: Update DATABASE_URL di Vercel Production  
Write-Host "1. Jalankan command ini setelah mendapat DATABASE_URL dari database cloud:"
Write-Host "vercel env add DATABASE_URL" -ForegroundColor Yellow
Write-Host "   - Paste connection string dari database provider"
Write-Host "   - Pilih: Production"
Write-Host ""

# Step 2: Generate Prisma Client
Write-Host "2. Generate Prisma Client:"
Write-Host "npx prisma generate" -ForegroundColor Green
Write-Host ""

# Step 3: Push Schema ke Database
Write-Host "3. Create tables di database:"
Write-Host "npx prisma db push" -ForegroundColor Green  
Write-Host ""

# Step 4: Seed Database (jika ada)
Write-Host "4. Seed database dengan data awal (optional):"
Write-Host "npm run db:seed" -ForegroundColor Green
Write-Host ""

# Step 5: Deploy
Write-Host "5. Deploy ke Vercel:"
Write-Host "vercel --prod" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== DATABASE PROVIDERS GRATIS ===" -ForegroundColor Magenta
Write-Host "Neon: https://neon.tech (Recommended)"
Write-Host "Supabase: https://supabase.com"  
Write-Host "Railway: https://railway.app"
Write-Host ""
Write-Host "Pilih salah satu, sign up dengan GitHub, dan copy connection string-nya"
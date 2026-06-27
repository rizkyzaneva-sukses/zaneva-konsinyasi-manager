#!/bin/bash
# ZKM Deploy Script for EasyPanel / VPS

set -e

echo "🚀 Deploying ZKM..."

# Build and start services
echo "📦 Building Docker containers..."
docker compose up -d --build

# Wait for database
echo "⏳ Waiting for database..."
sleep 5

# Push schema
echo "🗄️ Pushing database schema..."
docker compose exec -T app npx prisma db push

# Seed if first deploy
echo "🌱 Seeding database..."
docker compose exec -T app npx tsx prisma/seed.ts || echo "Seed skipped (data may already exist)"

echo "✅ Deploy complete!"
echo "🌐 Access at: http://localhost:3000"
echo ""
echo "📋 Default credentials:"
echo "  Admin:  admin / admin123"
echo "  Staff:  staff / staff123"
echo "  Venue:  venue1 / venue123"

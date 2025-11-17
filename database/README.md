# Database Setup

## Option 1: Local PostgreSQL (Development)

### Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Using Docker (Recommended for dev):**
```bash
docker run -d \
  --name operastudio-postgres \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=operastudio \
  -p 5432:5432 \
  postgres:16-alpine

# Wait for it to start
sleep 5
```

### Apply Schema

```bash
# If using Docker
docker exec -i operastudio-postgres psql -U postgres -d operastudio < schema.sql

# If using local PostgreSQL
psql -U postgres -d operastudio -f schema.sql
```

### Connection String

Add to `.env.local`:

```env
DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/operastudio"
```

## Option 2: Vercel Postgres (Production)

1. Go to your Vercel project
2. Click "Storage" → "Create Database" → "Postgres"
3. Copy the connection string
4. Run schema:

```bash
# Install Vercel CLI
npm i -g vercel

# Connect to your database
vercel env pull .env.local

# Run migrations (you'll need to set this up)
# Or use Prisma/Drizzle for migrations
```

## Option 3: Supabase (Easy Setup)

1. Create account at supabase.com
2. Create new project
3. Go to SQL Editor
4. Paste schema.sql and run
5. Get connection string from Settings → Database
6. Add to `.env.local`

## Verify Setup

```bash
# Test connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM agent_credentials;"

# Should return 0 (table exists, no rows)
```

## Next Steps

Once database is set up:
1. ✅ Database schema created
2. → Install database client in Next.js
3. → Create database utility functions
4. → Test CRUD operations

# Railway Deployment Checklist

## Pre-Deployment ✅

- [x] TypeScript compilation passes
- [x] Build succeeds (`npm run build`)
- [x] All environment variables documented
- [x] Railway configuration file created (`railway.json`)
- [x] `.gitignore` updated
- [x] Production audit completed

## GitHub Setup

1. **Initialize Git** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Production ready: Railway deployment"
   ```

2. **Create GitHub Repository**:
   - Go to https://github.com/new
   - Create repository (e.g., `operastudio`)
   - Don't initialize with README (if you have one)

3. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/yourusername/operastudio.git
   git branch -M main
   git push -u origin main
   ```

## Railway Setup

1. **Create Railway Account**: https://railway.app
2. **Create New Project**: "Deploy from GitHub repo"
3. **Select Repository**: Choose your GitHub repo
4. **Add PostgreSQL**: Click "+ New" → "Database" → "PostgreSQL"
5. **Add Redis**: Click "+ New" → "Database" → "Redis"

## Environment Variables

Set these in Railway → Your Service → Variables:

### Required
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - From Clerk dashboard
- `CLERK_SECRET_KEY` - From Clerk dashboard
- `GEMINI_API_KEY` - From Google AI Studio
- `DATABASE_URL` - Auto-set by Railway PostgreSQL
- `REDIS_URL` - Auto-set by Railway Redis

### Optional
- `BRAVE_API_KEY` - For web search
- `NEXT_PUBLIC_WS_URL` - WebSocket server URL
- `NODE_ENV=production`

## Database Migration

After PostgreSQL is created:

```bash
# Option 1: Railway CLI
railway connect postgres
# Then paste contents of database/schema.sql

# Option 2: Railway Dashboard
# Go to PostgreSQL service → "Connect" → "Query"
# Paste database/schema.sql and run
```

## Deploy

Railway automatically deploys on push to main branch:

```bash
git push origin main
```

Monitor deployment in Railway dashboard.

## Post-Deployment

- [ ] Verify health endpoint: `https://your-app.railway.app/api/chat` (GET)
- [ ] Test authentication flow
- [ ] Test chat functionality
- [ ] Verify database connection
- [ ] Verify Redis connection
- [ ] Check Railway logs for errors

## Troubleshooting

See `RAILWAY_DEPLOYMENT.md` for detailed troubleshooting guide.

---

**Ready to deploy!** 🚀


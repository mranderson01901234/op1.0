# Deployment Preparation Checklist

This checklist ensures your application is ready for GitHub push and Railway deployment.

## ✅ Pre-Deployment Checklist

### 1. Code Quality
- [x] TypeScript compilation passes (`npm run build`)
- [x] No TypeScript errors
- [x] Linting passes (`npm run lint`)
- [x] All tests pass (if applicable)

### 2. Configuration Files
- [x] `.gitignore` updated (excludes `.env`, `node_modules`, `.next`, etc.)
- [x] `railway.json` configured correctly
- [x] `next.config.js` production-ready
- [x] `package.json` scripts verified

### 3. Environment Variables
- [x] All environment variables documented in `ENV_VARIABLES.md`
- [x] No hardcoded secrets in code
- [x] Default values are development-only fallbacks
- [x] Production environment variables ready to set in Railway

### 4. Database
- [x] Database schema in `database/schema.sql`
- [x] Migration script ready
- [x] No hardcoded database credentials

### 5. Security
- [x] `.env` files excluded from git
- [x] No API keys committed
- [x] Clerk keys ready (production keys for Railway)
- [x] All sensitive data uses environment variables

### 6. Build & Dependencies
- [x] `package.json` dependencies up to date
- [x] `package-lock.json` committed
- [x] Build command works: `npm run build`
- [x] Start command works: `npm start`

## 🚀 GitHub Push Steps

### 1. Verify Git Status
```bash
# Check what will be committed
git status

# Ensure no sensitive files are staged
git diff --cached | grep -i "api_key\|secret\|password"
```

### 2. Commit Changes
```bash
# Add all changes
git add .

# Commit with descriptive message
git commit -m "Production ready: Railway deployment preparation"
```

### 3. Push to GitHub
```bash
# If first push
git remote add origin https://github.com/yourusername/operastudio.git
git branch -M main
git push -u origin main

# If repository already exists
git push origin main
```

## 🚂 Railway Deployment Steps

### 1. Create Railway Project
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will auto-detect Next.js

### 2. Add Services
1. **PostgreSQL**: Click "+ New" → "Database" → "PostgreSQL"
2. **Redis**: Click "+ New" → "Database" → "Redis"

### 3. Set Environment Variables
Go to your service → "Variables" tab and add:

**Required:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_live_...` (from Clerk dashboard)
- `CLERK_SECRET_KEY` = `sk_live_...` (from Clerk dashboard)
- `GEMINI_API_KEY` = `your_gemini_api_key` (from Google AI Studio)

**Auto-set by Railway:**
- `DATABASE_URL` (from PostgreSQL service)
- `REDIS_URL` (from Redis service)
- `PORT` (Railway sets automatically)
- `RAILWAY_ENVIRONMENT` (Railway sets automatically)

**Optional:**
- `BRAVE_API_KEY` = `your_brave_api_key` (if using web search)
- `NODE_ENV` = `production`
- `NEXT_PUBLIC_WS_URL` = `wss://your-ws-domain.com` (if using WebSocket server)

### 4. Run Database Migration
```bash
# Option 1: Railway CLI
railway login
railway link
railway run psql $DATABASE_URL < database/schema.sql

# Option 2: Railway Dashboard
# Go to PostgreSQL service → "Connect" → "Query"
# Copy contents of database/schema.sql and run
```

### 5. Deploy
Railway automatically deploys when you push to GitHub. Monitor deployment in Railway dashboard.

### 6. Verify Deployment
- [ ] Application loads at Railway URL
- [ ] Authentication works (Clerk sign-in)
- [ ] Chat functionality works
- [ ] Database connection successful (check logs)
- [ ] Redis connection successful (check logs)
- [ ] No errors in Railway logs

## 📋 Post-Deployment Verification

### Health Checks
```bash
# Check application health
curl https://your-app.railway.app/

# Check API endpoint
curl https://your-app.railway.app/api/chat
```

### Monitor Logs
```bash
# View logs in Railway dashboard or CLI
railway logs --tail
```

Look for:
- ✅ "Ready on http://localhost:3000"
- ✅ "Database connected"
- ✅ "Redis connected"
- ❌ Any error messages

### Test Functionality
- [ ] User can sign in with Clerk
- [ ] Chat messages send and receive
- [ ] Gemini API responds correctly
- [ ] Database persists data
- [ ] Redis pub/sub works (if using agent features)

## 🔧 Troubleshooting

### Build Fails
- Check Railway build logs
- Verify `package.json` dependencies
- Ensure Node.js version is compatible (18+)

### Runtime Errors
- Check environment variables are set correctly
- Verify database migration ran successfully
- Check Railway logs for specific errors

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL service is running
- Ensure database migration completed

### Authentication Issues
- Verify Clerk keys are production keys (not test)
- Check Clerk dashboard for correct keys
- Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_live_`

## 📚 Additional Resources

- [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) - Detailed deployment guide
- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - Environment variables reference
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Quick reference checklist

---

**Ready to deploy!** 🚀

Last Updated: 2025-01-27


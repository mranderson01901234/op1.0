# Railway Deployment Guide - Opera Studio

This guide walks you through deploying Opera Studio to Railway.

---

## Prerequisites

- Railway account (sign up at https://railway.app)
- GitHub account
- Clerk account (for authentication)
- Gemini API key
- (Optional) Brave Search API key

---

## Step 1: Prepare Your Repository

### 1.1 Ensure Code is Ready

```bash
# Check that everything is committed
git status

# Build locally to verify it works
npm run build

# Test production build
npm start
```

### 1.2 Push to GitHub

```bash
# If not already initialized
git init
git add .
git commit -m "Production ready: Railway deployment"

# Create GitHub repository, then:
git remote add origin https://github.com/yourusername/operastudio.git
git push -u origin main
```

---

## Step 2: Set Up Railway Project

### 2.1 Create New Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will detect Next.js automatically

### 2.2 Add PostgreSQL Service

1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will create a PostgreSQL instance
4. Note the `DATABASE_URL` (automatically set as environment variable)

### 2.3 Add Redis Service

1. In your Railway project, click "+ New"
2. Select "Database" → "Redis"
3. Railway will create a Redis instance
4. Note the `REDIS_URL` (automatically set as environment variable)

---

## Step 3: Configure Environment Variables

### 3.1 Required Variables

Go to your Railway service → "Variables" tab and add:

#### Clerk Authentication
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

**Get these from**: https://dashboard.clerk.com → Your Application → API Keys

#### Gemini AI
```
GEMINI_API_KEY=your_gemini_api_key
```

**Get from**: https://makersuite.google.com/app/apikey

#### Optional: Brave Search
```
BRAVE_API_KEY=your_brave_api_key
```

**Get from**: https://brave.com/search/api/

### 3.2 Automatic Variables

Railway automatically provides:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `PORT` - Port number (Railway sets this)
- `RAILWAY_ENVIRONMENT` - Environment name

### 3.3 Verify Variables

Your Railway variables should look like:
```
DATABASE_URL=postgresql://... (auto-set)
REDIS_URL=redis://... (auto-set)
PORT=3000 (auto-set)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
GEMINI_API_KEY=...
BRAVE_API_KEY=... (optional)
NODE_ENV=production
```

---

## Step 4: Run Database Migration

### 4.1 Using Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migration
railway run psql $DATABASE_URL < database/schema.sql
```

### 4.2 Using Railway Dashboard

1. Go to your PostgreSQL service in Railway
2. Click "Connect" → "Query"
3. Copy contents of `database/schema.sql`
4. Paste and run in the query editor

### 4.3 Verify Migration

```bash
# Connect to database
railway connect postgres

# Check tables
\dt

# Should show:
# - agent_credentials
# - tool_execution_logs
# - user_sessions
```

---

## Step 5: Deploy

### 5.1 Automatic Deployment

Railway automatically deploys when you push to GitHub:

```bash
git push origin main
```

Railway will:
1. Detect the push
2. Run `npm install`
3. Run `npm run build`
4. Start with `npm start`

### 5.2 Monitor Deployment

1. Go to Railway dashboard
2. Click on your service
3. View "Deployments" tab
4. Watch build logs
5. Check for errors

### 5.3 Verify Deployment

Once deployed, Railway provides a URL like:
```
https://your-app.railway.app
```

Test endpoints:
- Health check: `https://your-app.railway.app/api/chat` (GET)
- Home page: `https://your-app.railway.app`

---

## Step 6: Post-Deployment

### 6.1 Test Application

1. **Authentication**:
   - Visit your Railway URL
   - Sign in with Clerk
   - Verify authentication works

2. **Chat Functionality**:
   - Send a test message
   - Verify Gemini API responds
   - Check for errors in Railway logs

3. **Database**:
   - Create a conversation
   - Verify it persists
   - Check database tables

4. **Redis**:
   - If using agent features, verify Redis pub/sub works
   - Check Redis connection in logs

### 6.2 Monitor Logs

```bash
# View logs in Railway dashboard
# Or use CLI:
railway logs
```

Look for:
- ✅ "Ready on http://localhost:3000"
- ✅ Database connection successful
- ✅ Redis connection successful
- ❌ Any error messages

### 6.3 Set Up Custom Domain (Optional)

1. Go to Railway service → "Settings" → "Domains"
2. Click "Custom Domain"
3. Enter your domain
4. Follow DNS instructions
5. Railway handles SSL automatically

---

## Step 7: Troubleshooting

### Build Fails

**Error**: "Module not found"
- **Solution**: Check `package.json` dependencies are correct

**Error**: "TypeScript errors"
- **Solution**: Run `npm run build` locally to see errors

**Error**: "Environment variable missing"
- **Solution**: Verify all required variables are set in Railway

### Runtime Errors

**Error**: "Database connection failed"
- **Solution**: Check `DATABASE_URL` is correct
- **Solution**: Verify PostgreSQL service is running
- **Solution**: Check database migration ran successfully

**Error**: "Redis connection failed"
- **Solution**: Check `REDIS_URL` is correct
- **Solution**: Verify Redis service is running

**Error**: "Clerk authentication failed"
- **Solution**: Verify Clerk keys are production keys (not test)
- **Solution**: Check Clerk dashboard for correct keys

### Performance Issues

**Slow builds**:
- Railway caches `node_modules` between builds
- First build may take longer

**High memory usage**:
- Railway provides metrics dashboard
- Check memory usage in Railway dashboard
- Consider upgrading plan if needed

---

## Step 8: Continuous Deployment

### 8.1 GitHub Integration

Railway automatically deploys on push to main branch:
- Push to `main` → Automatic deployment
- Push to other branches → No deployment (unless configured)

### 8.2 Environment Management

Railway supports multiple environments:
- **Production**: Main branch
- **Preview**: Other branches (optional)
- **Staging**: Separate project (optional)

### 8.3 Rollback

If deployment fails:
1. Go to Railway dashboard
2. Click "Deployments"
3. Find previous successful deployment
4. Click "Redeploy"

---

## Step 9: Monitoring & Maintenance

### 9.1 Railway Metrics

Railway provides:
- CPU usage
- Memory usage
- Network traffic
- Request count
- Error rate

View in Railway dashboard → Your service → "Metrics"

### 9.2 Logs

View logs in Railway dashboard or CLI:
```bash
railway logs --tail
```

### 9.3 Database Backups

Railway PostgreSQL includes:
- Automatic daily backups
- Point-in-time recovery
- Manual backup option

Access in Railway dashboard → PostgreSQL service → "Backups"

---

## Step 10: Scaling

### 10.1 Horizontal Scaling

Railway can scale your service:
1. Go to service → "Settings" → "Scaling"
2. Enable auto-scaling
3. Set min/max instances

### 10.2 Vertical Scaling

Upgrade Railway plan for:
- More CPU
- More memory
- Higher limits

---

## Additional Resources

- Railway Docs: https://docs.railway.app
- Next.js Deployment: https://nextjs.org/docs/deployment
- Clerk Production: https://clerk.com/docs/deployments/overview

---

## Support

If you encounter issues:
1. Check Railway logs
2. Check Railway status page
3. Review this guide
4. Check `PRODUCTION_AUDIT.md` for common issues

---

**Last Updated**: 2025-01-27


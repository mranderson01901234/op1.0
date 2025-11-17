# Environment Variables Reference

This document lists all environment variables required for Opera Studio.

---

## Required Variables

### Clerk Authentication

**Production Keys** (from https://dashboard.clerk.com):
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

**Development Keys** (for local testing):
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Database

**Railway PostgreSQL** (automatically provided):
```
DATABASE_URL=postgresql://postgres:password@host:port/database
```

**Local Development**:
```
DATABASE_URL=postgresql://postgres:devpassword@localhost:5433/operastudio
```

### Redis

**Railway Redis** (automatically provided):
```
REDIS_URL=redis://host:port
# OR with password:
REDIS_URL=redis://:password@host:port
```

**Local Development**:
```
REDIS_URL=redis://localhost:6380
```

### Gemini AI

**Required** (from https://makersuite.google.com/app/apikey):
```
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## Optional Variables

### Brave Search

**Optional** (from https://brave.com/search/api/):
```
BRAVE_API_KEY=your_brave_api_key_here
```

### WebSocket Server

**If using separate WebSocket service**:
```
NEXT_PUBLIC_WS_URL=wss://your-ws-domain.com
```

**Local Development**:
```
NEXT_PUBLIC_WS_URL=ws://localhost:8082
```

### Node Environment

**Production**:
```
NODE_ENV=production
```

**Development**:
```
NODE_ENV=development
```

### Port

**Railway** (automatically set):
```
PORT=3000
```

**Local Development** (defaults to 3000):
```
PORT=3000
```

---

## Railway-Specific Variables

Railway automatically provides:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `PORT` - Port number
- `RAILWAY_ENVIRONMENT` - Environment name (production, preview, etc.)

---

## Setting Variables in Railway

1. Go to your Railway project
2. Click on your service
3. Go to "Variables" tab
4. Click "+ New Variable"
5. Add each variable with its value
6. Click "Deploy" to apply changes

---

## Security Notes

- ⚠️ Never commit `.env` files to Git
- ⚠️ Use production keys only in production
- ⚠️ Rotate API keys regularly
- ⚠️ Use Railway's secret management for sensitive values

---

## Verification

After setting variables, verify they're loaded:

```bash
# In Railway logs, you should see:
# - Database connection successful
# - Redis connection successful
# - Clerk initialized
```

---

**Last Updated**: 2025-01-27


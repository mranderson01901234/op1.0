# Opera Studio

A sophisticated AI-powered chat application with advanced scroll positioning logic, local agent integration, and browser automation capabilities.

## Features

- Real-time streaming chat interface powered by Google Gemini
- Advanced scroll positioning to prevent visual flashing and jumping
- Short response detection and dynamic spacer adjustment
- Smooth message positioning for both short and long conversations
- Copy and retry functionality for messages
- Clerk authentication integration
- Local agent support for desktop integration
- PostgreSQL and Redis for data persistence and pub/sub

## Critical Documentation

### ⚠️ Scroll Positioning Logic

This project implements complex scroll positioning logic to ensure smooth, flash-free message rendering. **Before making any changes to scroll-related code, please read:**

- **[SCROLL_POSITIONING_LOGIC.md](./SCROLL_POSITIONING_LOGIC.md)** - Comprehensive documentation of the scroll positioning system
- **[PERFORMANCE_AUDIT.md](./PERFORMANCE_AUDIT.md)** - Performance instrumentation details

### Key Components

- `components/chat/enhanced-chat-interface.tsx` - Main chat interface with scroll positioning logic
- Critical sections are marked with `⚠️ CRITICAL` comments in the code

### Important Notes

- The scroll positioning logic handles short chats (≤50% viewport) and long chats (>50% viewport) differently
- Short response detection dynamically adjusts spacing to prevent unnecessary scrolling
- All critical sections have detailed inline documentation

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL (for local development)
- Redis (for local development)
- Clerk account (for authentication)
- Google Gemini API key

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables (see ENV_VARIABLES.md)
cp .env.example .env.local
# Edit .env.local with your keys

# Run database migrations
psql $DATABASE_URL < database/schema.sql

# Run development server
npm run dev
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Deployment

### Railway Deployment

This application is configured for deployment on Railway. See **[RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)** for detailed deployment instructions.

**Quick Steps:**
1. Push code to GitHub
2. Create Railway project from GitHub repo
3. Add PostgreSQL and Redis services
4. Set environment variables (see [ENV_VARIABLES.md](./ENV_VARIABLES.md))
5. Run database migration
6. Deploy!

**Required Environment Variables:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key
- `GEMINI_API_KEY` - Google Gemini API key
- `DATABASE_URL` - PostgreSQL connection (auto-set by Railway)
- `REDIS_URL` - Redis connection (auto-set by Railway)

See **[ENV_VARIABLES.md](./ENV_VARIABLES.md)** for complete list.

### GitHub Setup

Before pushing to GitHub:

```bash
# Ensure all changes are committed
git add .
git commit -m "Production ready: Railway deployment"

# Push to GitHub
git push origin main
```

**Note:** Make sure `.env` files are in `.gitignore` (they are by default).

## Testing

When modifying scroll positioning logic, ensure you test:

- [ ] Short response in short chat: No flashing, no jumping
- [ ] Long response in short chat: No flashing, scrolls smoothly
- [ ] Short response in long chat: No jumping, spacer reduces early
- [ ] Long response in long chat: User message stays in place, no flashing
- [ ] Multiple messages: Positioning works correctly for each
- [ ] Retry functionality: Works correctly without breaking positioning

## Project Structure

```
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── chat/             # Chat interface components
│   ├── auth/             # Authentication components
│   └── editor/           # Code editor components
├── lib/                   # Utility libraries
│   ├── db/               # Database client
│   ├── redis/            # Redis client
│   └── gemini-client.ts  # Gemini AI client
├── database/             # Database schema
├── websocket-server/     # WebSocket server (optional)
├── local-agent/          # Local agent (optional)
├── railway.json          # Railway deployment config
├── ENV_VARIABLES.md      # Environment variables reference
├── RAILWAY_DEPLOYMENT.md # Deployment guide
└── README.md             # This file
```

## Contributing

**Before refactoring scroll positioning code:**

1. Read `SCROLL_POSITIONING_LOGIC.md`
2. Understand the difference between short and long chat behaviors
3. Test all scenarios listed in the testing checklist
4. Update documentation if behavior changes

## License

Private project - All rights reserved


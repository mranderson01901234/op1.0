# Search Feature Debugging Guide

## Quick Diagnosis

### Test 1: Check if you're signed in
1. Open http://localhost:3002
2. Look for "Sign in to continue" message
3. If you see it → **Sign in first using the button**
4. If you don't see it → You're signed in ✅

### Test 2: Open Browser Console
1. Press **F12** (or Cmd+Option+I on Mac)
2. Click **Console** tab
3. Try search query: "What's the latest news in AI?"
4. Watch for these logs:

**Expected logs:**
```
[SEARCH] Received search results: (8) [{...}, {...}, ...]
[SEARCH] Result count: 8
[SEARCH-UI] Streaming render: {hasResults: true, resultCount: 8, ...}
[SearchResponse] Rendering with: {query: "...", resultCount: 8, ...}
```

**If you see these → Backend working, check UI**
**If you DON'T see these → Backend issue**

### Test 3: Check Network Tab
1. In DevTools, click **Network** tab
2. Click the 🔍 icon to enable search mode (should turn blue)
3. Type: "latest AI news"
4. Send message
5. Look for `/api/chat` request
6. Click it → **Response** tab
7. Should see:
```
data: {"type":"search_results","results":[...]}
data: {"content":"The latest..."}
```

### Test 4: Check Server Logs
```bash
tail -f dev.log | grep "\[SEARCH\]"
```

Should show:
```
[SEARCH] Performing web search for: "..."
[SEARCH] Found 8 results
```

## Common Issues & Fixes

### Issue 1: Not Signed In
**Symptom**: See "Sign in to continue"
**Fix**: Click "Sign In" button, use Clerk auth

### Issue 2: Search Not Triggering
**Symptom**: No `[SEARCH]` logs in server
**Fix**:
- Click 🔍 icon to force search mode
- Or use queries with "latest", "recent", "what is"
- Or start with `/search`

### Issue 3: Results Not Displaying
**Symptom**: See `[SEARCH]` logs but no UI
**Fix**: Check browser console for errors:
```
Component errors?
Import errors?
Render errors?
```

### Issue 4: Brave API Error
**Symptom**: `[SEARCH] Error: ...` in logs
**Fix**:
1. Check API key in `.env.local`
2. Verify key is valid at https://brave.com/search/api/
3. Check rate limits

### Issue 5: SearchResponse Not Rendering
**Symptom**: `[SEARCH-UI] Streaming render: {hasResults: false}`
**Fix**:
1. Check if `currentSearchResults` is being set
2. Verify `search_results` message type is handled
3. Look for TypeScript errors in components

## Debug Checklist

Run through this checklist:

- [ ] Server is running (check http://localhost:3002)
- [ ] Signed in to Clerk (no "Sign in" message)
- [ ] Brave API key is in `.env.local`
- [ ] Search toggle (🔍) turns blue when clicked
- [ ] Browser console shows `[SEARCH]` logs
- [ ] Network tab shows `search_results` in response
- [ ] No errors in browser console
- [ ] No errors in server logs

## Manual Test

Try this exact sequence:

1. **Open browser**: http://localhost:3002
2. **Sign in** (if prompted)
3. **Open Console**: F12 → Console
4. **Click search icon**: 🔍 (should turn blue)
5. **Type**: "latest AI news"
6. **Send message**
7. **Watch console** for logs
8. **Check UI** for search results

## Expected vs Actual

### Expected UI Flow:
```
1. User message appears
2. "Searching..." indicator shows
3. "Reviewing sources · 8" appears
4. AI response streams in
5. Source cards appear below
6. Related questions at bottom
```

### If something's wrong:
Note where it stops and check:
- Browser console
- Network tab
- Server logs

## Component Hierarchy

If SearchResponse isn't rendering:

```
EnhancedChatInterface
└── Has searchResults?
    ├── YES → SearchResponse ✅
    │   ├── SearchHeader
    │   ├── SearchTabs
    │   ├── SearchThinking
    │   ├── SourcesDropdown
    │   ├── MessageRenderer
    │   ├── SourceCard[]
    │   └── RelatedQuestions
    │
    └── NO → MessageRenderer (regular chat)
```

Check:
1. `nextMessage.searchResults` exists?
2. `nextMessage.searchResults.length > 0`?
3. `console.log('[SEARCH-UI]')` appears?

## Quick Fixes

### Force Search Mode
```typescript
// In chat input, force search:
handleSendMessage(query, true); // true = force search
```

### Bypass Auth (Testing)
```typescript
// In .env.local, temporarily remove:
// NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
// (Restart server)
```

### Clear Cache
```bash
rm -rf .next
pnpm dev
```

### Restart Everything
```bash
# Kill servers
pkill -f "next dev"

# Clear and restart
rm -rf .next
pnpm dev
```

## Still Not Working?

1. **Share console output**: Copy all `[SEARCH]` logs
2. **Share network response**: Copy `/api/chat` response
3. **Screenshot**: Show the UI state
4. **Check**: Are you definitely signed in?

## Working Example

When it works, you'll see:

**Console:**
```
[SEARCH] Performing web search for: "latest AI news"
[SEARCH] Found 8 results
[SEARCH] Received search results: (8) [{title: "...", url: "...", ...}]
[SEARCH-UI] Streaming render: {hasResults: true, resultCount: 8}
[SearchResponse] Rendering with: {query: "latest AI news", resultCount: 8}
```

**UI:**
```
latest AI news
━━━━━━━━━━━━━━━━━
Answer | Images

Reviewed 8 sources ∨

The latest AI news includes...
[Source cards with logos]
Related questions...
```

If you see this → **It works!** 🎉

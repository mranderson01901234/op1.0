# Performance Audit Report

**Date:** 2024  
**Application:** OperaStudio Chat Interface  
**Framework:** Next.js 14.2.33 with React 18.3.1

## Executive Summary

This audit identifies performance optimization opportunities across bundle size, React rendering, API/data fetching, database queries, and Next.js configuration. Priority issues are marked with 🔴 (Critical), 🟡 (High), and 🟢 (Medium).

---

## 1. Bundle Size & Code Splitting 🔴

### Issues Found

#### 1.1 Monaco Editor Loaded Synchronously
**Location:** `components/editor/monaco-editor.tsx`  
**Impact:** Monaco Editor is ~2MB+ and blocks initial page load

**Current Code:**
```tsx
import Editor, { OnMount } from "@monaco-editor/react";
```

**Recommendation:**
```tsx
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then(mod => mod.default),
  { 
    ssr: false,
    loading: () => <div className="h-full flex items-center justify-center">Loading editor...</div>
  }
);
```

#### 1.2 Framer Motion Not Tree-Shaken
**Location:** Multiple components  
**Impact:** Entire Framer Motion library (~50KB) loaded even when only using basic animations

**Recommendation:**
- Use dynamic imports for animation-heavy components
- Consider lighter alternatives (e.g., CSS transitions, `react-spring`) for simple animations
- Or use named imports: `import { motion } from 'framer-motion'` (already done, but verify tree-shaking)

#### 1.3 Missing Dynamic Imports for Heavy Components
**Location:** `components/chat/enhanced-chat-interface.tsx`  
**Impact:** Large component (~1071 lines) loaded upfront

**Recommendation:**
```tsx
const SearchResponse = dynamic(() => import('./SearchResponse'), {
  loading: () => <div>Loading...</div>
});
```

---

## 2. React Rendering Optimizations 🔴

### Issues Found

#### 2.1 MessageRenderer Not Memoized
**Location:** `components/chat/message-renderer.tsx`  
**Impact:** Re-renders on every parent update, expensive markdown processing runs unnecessarily

**Current Code:**
```tsx
export function MessageRenderer({ content, isUser, onCitationClick, onSourceClick, searchResults }: MessageRendererProps) {
  const processContentWithCitations = (text: string) => {
    // Expensive regex operations
  };
  // ...
}
```

**Recommendation:**
```tsx
import { memo, useMemo } from 'react';

export const MessageRenderer = memo(function MessageRenderer({ 
  content, 
  isUser, 
  onCitationClick, 
  onSourceClick, 
  searchResults 
}: MessageRendererProps) {
  const processedContent = useMemo(() => {
    if (isUser) return content;
    return processContentWithCitations(content);
  }, [content, isUser, searchResults]);

  // ... rest of component
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.content === nextProps.content &&
    prevProps.isUser === nextProps.isUser &&
    prevProps.searchResults === nextProps.searchResults
  );
});
```

#### 2.2 Expensive Computations Not Memoized
**Location:** `components/chat/enhanced-chat-interface.tsx`  
**Impact:** Multiple expensive operations recalculated on every render

**Issues:**
- `formatToolCallMessage` function recreated on every render
- `processContentWithCitations` runs on every render
- Scroll calculations not memoized

**Recommendation:**
```tsx
// Move outside component or use useCallback
const formatToolCallMessage = useCallback((tool: string, params: any): string => {
  // ... existing code
}, []);

// Memoize scroll calculations
const scrollPosition = useMemo(() => {
  return calculateScrollForNewMessage();
}, [messages.length, /* other deps */]);
```

#### 2.3 Excessive useEffect Hooks
**Location:** `components/chat/enhanced-chat-interface.tsx`  
**Impact:** 35+ hooks causing unnecessary re-renders

**Issues:**
- Multiple scroll-related effects that could be combined
- Storage polling every 100ms in `app-layout.tsx` (line 26)

**Recommendation:**
```tsx
// Combine related effects
useEffect(() => {
  const container = messagesRef.current;
  if (!container) return;

  const handleScroll = throttle(() => {
    checkScrollPosition();
    // Other scroll-related logic
  }, 100);

  container.addEventListener("scroll", handleScroll);
  return () => container.removeEventListener("scroll", handleScroll);
}, [checkScrollPosition]);
```

#### 2.4 localStorage Polling Too Frequent
**Location:** `components/layout/app-layout.tsx:26`  
**Impact:** Polls localStorage every 100ms unnecessarily

**Current Code:**
```tsx
const interval = setInterval(handleStorage, 100);
```

**Recommendation:**
```tsx
// Use storage event listener + debounced polling
const interval = setInterval(handleStorage, 1000); // Reduce to 1s
// Or use custom event system instead of polling
```

---

## 3. API & Data Fetching 🟡

### Issues Found

#### 3.1 No Response Caching
**Location:** `app/api/chat/route.ts`  
**Impact:** Same queries hit API repeatedly

**Recommendation:**
```tsx
import { unstable_cache } from 'next/cache';

// Cache search results
const cachedSearch = unstable_cache(
  async (query: string) => braveSearch(query),
  ['search'],
  { revalidate: 300 } // 5 minutes
);
```

#### 3.2 Synchronous localStorage Operations
**Location:** `lib/storage.ts`  
**Impact:** Large conversations can block main thread

**Current Code:**
```tsx
localStorage.setItem(storageKey, JSON.stringify(trimmed));
```

**Recommendation:**
```tsx
// Use requestIdleCallback for non-critical saves
const saveConversationAsync = (conversation: Conversation, userId?: string | null) => {
  if (typeof window === 'undefined') return;
  
  requestIdleCallback(() => {
    try {
      const storageKey = getStorageKey(userId);
      const conversations = getConversations(userId);
      // ... rest of logic
      localStorage.setItem(storageKey, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  }, { timeout: 2000 });
};
```

#### 3.3 No Debouncing on Scroll Handlers
**Location:** `components/chat/enhanced-chat-interface.tsx`  
**Impact:** Scroll events fire excessively

**Recommendation:**
```tsx
import { throttle } from 'lodash-es'; // or implement custom throttle

const throttledScrollCheck = useCallback(
  throttle(() => {
    checkScrollPosition();
  }, 100),
  [checkScrollPosition]
);
```

#### 3.4 Large Editor Context Sent Every Request
**Location:** `app/api/chat/route.ts:569-582`  
**Impact:** Sending full file content unnecessarily

**Recommendation:**
```tsx
// Only send file content if explicitly requested or if file is small
const editorContext = (openFiles.length > 0 || activeTab) ? {
  openFiles: openFiles.map(f => ({ path: f.path, isDirty: f.isDirty })),
  activeFile: activeFile && activeFile.content.length < 50000 ? {
    path: activeFile.path,
    content: activeFile.content,
    isDirty: activeFile.isDirty,
  } : { path: activeFile?.path, isDirty: activeFile?.isDirty },
  // ...
} : null;
```

---

## 4. Database Optimizations 🟡

### Issues Found

#### 4.1 No Query Result Caching
**Location:** `lib/db/client.ts`  
**Impact:** Repeated queries hit database unnecessarily

**Recommendation:**
```tsx
import NodeCache from 'node-cache';

const queryCache = new NodeCache({ stdTTL: 300 }); // 5 min TTL

export async function query(text: string, params?: any[]) {
  const cacheKey = `${text}:${JSON.stringify(params)}`;
  const cached = queryCache.get(cacheKey);
  if (cached) return cached;

  const res = await pool.query(text, params);
  queryCache.set(cacheKey, res);
  return res;
}
```

#### 4.2 Connection Pool Could Be Optimized
**Location:** `lib/db/client.ts:10`  
**Current:** `max: 20` connections

**Recommendation:**
- Monitor connection usage
- Adjust based on actual load
- Consider connection pooling at application level for serverless

---

## 5. Next.js Configuration 🟡

### Issues Found

#### 5.1 Missing Performance Optimizations
**Location:** `next.config.js`  
**Impact:** Missing compression, image optimization, and other optimizations

**Current Config:**
```js
const nextConfig = {
  output: 'standalone',
  experimental: {},
}
```

**Recommendation:**
```js
const nextConfig = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
  },
  experimental: {
    optimizeCss: true,
  },
}
```

#### 5.2 Missing Image Optimization
**Location:** `components/chat/message-renderer.tsx:187`  
**Impact:** Favicons loaded without optimization

**Current Code:**
```tsx
<img
  src={faviconUrl}
  alt=""
  className="inline-block w-3.5 h-3.5 rounded-sm"
/>
```

**Recommendation:**
```tsx
import Image from 'next/image';

<Image
  src={faviconUrl}
  alt=""
  width={14}
  height={14}
  className="inline-block rounded-sm"
  unoptimized // For external favicons
/>
```

---

## 6. Component-Specific Optimizations 🟢

### Issues Found

#### 6.1 Large Component File
**Location:** `components/chat/enhanced-chat-interface.tsx` (1071 lines)  
**Impact:** Hard to optimize, maintain, and tree-shake

**Recommendation:**
- Split into smaller components:
  - `MessageList.tsx`
  - `StreamingMessage.tsx`
  - `ScrollManager.tsx`
  - `MessageActions.tsx`

#### 6.2 ReactMarkdown Re-renders Entire Tree
**Location:** `components/chat/message-renderer.tsx:68`  
**Impact:** Expensive markdown parsing on every render

**Recommendation:**
```tsx
const memoizedMarkdown = useMemo(() => {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={...}>
      {processedContent}
    </ReactMarkdown>
  );
}, [processedContent]);
```

#### 6.3 No Virtualization for Long Message Lists
**Location:** `components/chat/enhanced-chat-interface.tsx:842`  
**Impact:** All messages rendered even when off-screen

**Recommendation:**
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

// Only render visible messages
const virtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => messagesRef.current,
  estimateSize: () => 100,
});
```

---

## 7. Rate Limiting 🟢

### Issues Found

#### 7.1 In-Memory Rate Limiter Not Persistent
**Location:** `lib/rate-limiter.ts`  
**Impact:** Rate limits reset on server restart

**Recommendation:**
- Use Redis for distributed rate limiting
- Already have `ioredis` dependency - implement Redis-based limiter

---

## Priority Action Items

### Critical (Do First) ✅ COMPLETE
1. ✅ Memoize `MessageRenderer` component
2. ✅ Add dynamic import for Monaco Editor
3. ✅ Reduce localStorage polling frequency
4. ✅ Add Next.js performance config

### High Priority ✅ COMPLETE
5. ✅ Memoize expensive computations in chat interface
6. ✅ Debounce/throttle scroll handlers
7. ✅ Add query caching for database
8. ✅ Optimize editor context payload size
9. ✅ Optimize localStorage with requestIdleCallback
10. ✅ Create throttle utility function

### Medium Priority
11. Split large components
12. Add image optimization
13. Consider virtualization for long lists
14. Add API response caching

### Low Priority
15. Implement Redis-based rate limiting

---

## Performance Metrics to Track

1. **First Contentful Paint (FCP)** - Target: < 1.8s
2. **Largest Contentful Paint (LCP)** - Target: < 2.5s
3. **Time to Interactive (TTI)** - Target: < 3.8s
4. **Total Blocking Time (TBT)** - Target: < 200ms
5. **Cumulative Layout Shift (CLS)** - Target: < 0.1
6. **Bundle Size** - Monitor with `@next/bundle-analyzer`

---

## Tools for Monitoring

1. **Lighthouse** - Run audits regularly
2. **Next.js Bundle Analyzer** - `npm install @next/bundle-analyzer`
3. **React DevTools Profiler** - Identify re-render issues
4. **Web Vitals** - Add to app for real user monitoring

---

## Estimated Impact

- **Bundle Size Reduction:** ~30-40% (with code splitting)
- **Initial Load Time:** ~40-50% improvement
- **Re-render Performance:** ~60-70% reduction in unnecessary renders
- **API Response Time:** ~20-30% improvement (with caching)

---

## Next Steps

1. Implement critical fixes first
2. Measure baseline performance metrics
3. Apply optimizations incrementally
4. Re-measure after each change
5. Document performance improvements

---

**Generated:** Performance Audit  
**Review Date:** After implementing critical fixes

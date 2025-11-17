# Perplexity-Style Search UI - Complete Implementation

A pixel-perfect recreation of Perplexity's search interface for OperaStudio, featuring all the premium UI elements and interactions.

## 🎨 UI Components Overview

### 1. Search Header
**Component**: `SearchHeader.tsx`

- **Condensed Query Display**: Shows a clean, summarized version of the user's search query
- **Typography**: Large (3xl), normal weight, tracking-tight for that premium look
- **Example**: "what is the latest news in AI?" → displays at top

### 2. Tabbed Navigation
**Component**: `SearchTabs.tsx`

Matches Perplexity's tab system:
- **Answer** (always visible) - Main AI response with sources
- **Images** - Shows when image results are available
- **Videos** - Shows when video content is found
- **Listen** - Shows for podcast/audio content

**Features**:
- Active tab indicator (white underline)
- Smooth transitions
- Icons for each tab type
- Disabled state for tabs without content

### 3. Search Thinking UI
**Component**: `SearchThinking.tsx`

Shows real-time search progress (like Perplexity's "Pro Search"):

**Stages**:
1. **Searching** - Shows search queries being executed
   ```
   🔄 Searching...
      🔍 artificial intelligence latest news 2025
      🔍 AI developments November 2025
   ```

2. **Reviewing** - Displays source count
   ```
   🔄 Reviewing sources · 13
   ```

3. **Analyzing** - Shows synthesis message
   ```
   🔄 Surveying recent AI developments to summarize...
   ```

**Design**:
- Animated loading spinner
- Pulsing dots animation
- Gray text (#9CA3AF)
- Monospace font for query strings

### 4. Sources Dropdown
**Component**: `SourcesDropdown.tsx`

Collapsible list of all reviewed sources:

**Features**:
- **Collapsed by default**: "Reviewed 13 sources" with chevron
- **Expanded view**: Shows all sources in compact list
- **Hover effects**: Highlights on hover with external link icon
- **Favicon display**: Shows site favicon or colored placeholder
- **Click to view**: Opens source in right pane

**Design**:
- Text: `text-gray-400` → `text-gray-300` on hover
- Background: `hover:bg-white/5`
- Icons: 16px favicons
- Smooth expand/collapse animation

### 5. Source Cards
**Component**: `SourceCard.tsx`

Premium cards matching Perplexity's design:

**Layout**:
```
┌────────────────────────────────────────────────┐
│ [Thumbnail]  Title (2 lines max)          [#] │
│ 64x64        Description (2 lines)            │
│              📺 youtube · 2 hours ago          │
└────────────────────────────────────────────────┘
```

**Features**:
- **Thumbnail**: 64x64px company logo (Clearbit API) with favicon fallback
- **Citation number**: Top right corner, gray circle
- **Content badges**: 📺 Video, 📰 Article, 🎧 Podcast
- **Hover state**: Border color change, background highlight, external link icon
- **Click action**: Opens in right pane article viewer

**Design**:
- Border: `border-gray-800` → `border-gray-700` on hover
- Background: `bg-transparent` → `bg-white/5` on hover
- Highlighted: `bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/30`
- Rounded: `rounded-lg`
- Padding: `p-4`

### 6. AI Response with Citations
**Integration**: `MessageRenderer.tsx` + `SearchResponse.tsx`

**Citation Format**:
- Inline citations: `[1]`, `[2]`, `[3]` in text
- Styled as clickable pills
- Blue accent color (`bg-blue-500/20 text-blue-400`)
- Border: `border-blue-500/30`
- Hover: Darker background and border

**Citation Click Behavior**:
1. Click `[1]` in response
2. Scrolls to Source #1 card
3. Highlights card for 2 seconds
4. Smooth scroll animation

### 7. Related Questions
**Component**: `RelatedQuestions.tsx`

Shows at bottom of response (after sources):

**Features**:
- **5 contextual questions** based on original query
- **Click to search**: Automatically triggers new search with question
- **Icon**: Corner-down-right arrow (⤷)
- **Hover effect**: Background highlight

**Example Questions**:
```
↳ Key AI safety developments this week
↳ Major product launches and company moves in AI today
↳ Regulatory or government actions on AI in the last month
↳ Breakthrough research papers published recently
↳ How AI is affecting jobs for new graduates
```

**Design**:
- Text: `text-gray-400` → `text-gray-300` on hover
- Background: `hover:bg-white/5`
- Border top: `border-t border-gray-800`
- Spacing: `mt-8 pt-6`

## 📦 Main Container Component

**Component**: `SearchResponse.tsx`

Orchestrates all sub-components into a cohesive search experience:

**Props**:
```typescript
{
  query: string;                    // Original user query
  condensedQuery?: string;          // Shortened version for header
  searchResults: BraveSearchResult[]; // Array of sources
  aiResponse: string;               // LLM response with citations
  isStreaming: boolean;             // Still generating?
  onCitationClick: (index) => void; // Citation click handler
  onSourceClick: (url, index) => void; // Source card click
  onRelatedQuestionClick: (q) => void; // Related question click
  highlightedCitation?: number;     // Currently highlighted source
  thinkingStage?: Stage;            // Current search stage
  searchQueries?: string[];         // Queries being executed
}
```

**Component Tree**:
```
SearchResponse
├── SearchHeader
├── SearchTabs
├── SearchThinking (if streaming)
├── SourcesDropdown (if done && has results)
├── MessageRenderer (AI response with citations)
├── SourceCard[] (grid of source cards)
└── RelatedQuestions (if done)
```

## 🎯 User Flow

### Complete Search Experience:

1. **User types**: "What's the latest news in AI?"

2. **Search Mode Active**: Magnifying glass button is blue

3. **Thinking Phase** (2-3 seconds):
   ```
   what is the latest news in AI?
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Answer | Images

   🔄 Searching...
      🔍 artificial intelligence latest news 2025
      🔍 AI breakthroughs November 2025

   🔄 Reviewing sources · 13
   ```

4. **Response Streaming**:
   ```
   what is the latest news in AI?
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Answer | Images

   Reviewed 13 sources ∨

   The latest news in artificial intelligence includes
   major updates in AI model releases [1], breakthroughs
   in robotics [2], corporate and scientific partnerships
   [3], and innovations in AI hardware and safety...
   ```

5. **Complete Response**:
   - Full AI answer with inline citations
   - Grid of source cards below
   - Related questions at bottom

6. **Interaction**:
   - Click citation `[1]` → Scrolls to & highlights Source #1
   - Click source card → Opens article in right pane
   - Click related question → New search starts

## 🎨 Design Tokens

### Colors
```css
/* Backgrounds */
--bg-card: transparent;
--bg-card-hover: rgba(255, 255, 255, 0.05);
--bg-highlighted: rgba(59, 130, 246, 0.1);

/* Borders */
--border-default: #1f2937; /* gray-800 */
--border-hover: #374151;   /* gray-700 */
--border-highlighted: rgba(59, 130, 246, 0.5);

/* Text */
--text-primary: #ffffff;
--text-secondary: #9ca3af; /* gray-400 */
--text-tertiary: #6b7280;  /* gray-500 */

/* Accents */
--accent-blue: #3b82f6;
--accent-blue-bg: rgba(59, 130, 246, 0.2);
```

### Spacing
```css
--spacing-section: 2rem;   /* Between major sections */
--spacing-card: 0.75rem;   /* Between source cards */
--spacing-content: 1.5rem; /* Content padding */
```

### Typography
```css
/* Search Header */
font-size: 1.875rem;       /* 3xl */
font-weight: 400;          /* normal */
letter-spacing: -0.025em;  /* tracking-tight */

/* Source Titles */
font-size: 0.875rem;       /* sm */
font-weight: 500;          /* medium */

/* Descriptions */
font-size: 0.75rem;        /* xs */
color: #6b7280;            /* gray-500 */
```

## 🔄 State Management

### Search Flow States
```typescript
type SearchStage =
  | 'searching'   // Executing search queries
  | 'reviewing'   // Processing results
  | 'analyzing'   // Synthesizing response
  | 'done';       // Complete

// Component tracks:
- currentSearchResults: BraveSearchResult[]
- highlightedCitation: number | null
- thinkingStage: SearchStage
- activeTab: 'answer' | 'images' | 'videos' | 'audio'
```

## 📱 Responsive Behavior

### Mobile (<768px)
- Source cards: Stack vertically, full width
- Thumbnails: 48x48px instead of 64x64px
- Tabs: Icon-only display
- Related questions: Compressed text

### Tablet (768-1024px)
- Source cards: 2-column grid
- Full tab labels shown
- Maintained spacing

### Desktop (>1024px)
- Source cards: Full width, horizontal layout
- Right pane: Article viewer appears
- Maximum content width: 720px

## 🚀 Performance Optimizations

1. **Image Loading**:
   - Lazy load thumbnails
   - Favicon fallback chain
   - Error handling for missing images

2. **Animations**:
   - Hardware-accelerated transforms
   - RequestAnimationFrame for smooth scrolling
   - Debounced resize handlers

3. **Rendering**:
   - Memoized source cards
   - Virtualized long source lists (if >20 results)
   - Optimistic UI updates

## 📂 File Structure

```
components/chat/
├── SearchResponse.tsx         # Main orchestrator
├── SearchHeader.tsx           # Query title
├── SearchTabs.tsx            # Answer/Images/Videos tabs
├── SearchThinking.tsx        # Progress indicator
├── SourcesDropdown.tsx       # Collapsible source list
├── SourceCard.tsx            # Individual source card
├── RelatedQuestions.tsx      # Bottom suggestions
└── message-renderer.tsx      # Updated with citation support
```

## 🎯 Future Enhancements

### Phase 2 (Planned):
- [ ] Right-pane web article viewer (replaces Monaco for web content)
- [ ] Image search results tab
- [ ] Video thumbnail previews
- [ ] Citation hover preview (show source snippet)
- [ ] Search history sidebar
- [ ] Export search results (PDF, Markdown)

### Phase 3 (Advanced):
- [ ] Multi-modal results (images in Answer tab)
- [ ] Real-time collaborative search
- [ ] Search collections/folders
- [ ] API for programmatic search
- [ ] Mobile app with same UI

## 🐛 Testing Checklist

- [ ] Search triggers automatically for current events queries
- [ ] Manual search toggle works
- [ ] All 3 thinking stages display correctly
- [ ] Sources dropdown expands/collapses smoothly
- [ ] Citation clicks scroll to correct source
- [ ] Source cards highlight on citation click (2s duration)
- [ ] Related questions trigger new searches
- [ ] Tabs switch correctly (when content available)
- [ ] Thumbnails load with proper fallbacks
- [ ] Mobile layout displays correctly
- [ ] Streaming response updates smoothly
- [ ] No UI jumping during response completion

## 📚 Related Documentation

- [SEARCH_FEATURE.md](./SEARCH_FEATURE.md) - API integration guide
- [Brave Search API Docs](https://brave.com/search/api/)
- [Perplexity Design System](https://www.perplexity.ai/) - Visual reference

---

**Implementation Status**: ✅ Complete (v1.0)
**Last Updated**: 2025-11-17
**Maintainer**: OperaStudio Team

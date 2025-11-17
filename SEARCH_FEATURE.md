# Perplexity-Style Web Search Feature

A premium web search integration for OperaStudio using the Brave Search API, featuring automatic search detection, inline citations, and beautiful source cards.

## Features

### 🔍 Smart Search Detection
- **Automatic trigger**: Detects when queries need current information (e.g., "latest news", "what is", "how to")
- **Manual trigger**: Toggle search mode with magnifying glass button in chat input
- **Command trigger**: Use `/search` prefix in your message
- **Context-aware**: Automatically skips search for coding-related queries

### 📚 Citation System
- **Inline citations**: AI response includes numbered citations [1], [2], [3]
- **Clickable citations**: Click any citation to scroll to and highlight its source
- **Natural integration**: Citations are woven naturally into the AI's response

### 🎨 Source Cards (Perplexity-Style)
- **Dark theme**: Subtle dark gray cards with hover effects
- **Rich metadata**: Domain, favicon, title, description
- **Content badges**: Automatically detects and shows 📺 Video, 📰 Article, or 🎧 Podcast
- **Smooth animations**: Fade-in effects and smooth highlighting
- **Direct access**: Click "View Article" to open in new tab

### 🚀 Performance
- **Fast API**: Uses Brave Search API Pro for reliable, fast results
- **Top results**: Fetches 5-8 most relevant sources
- **Streaming**: AI response streams naturally with sources appearing at the end
- **Caching**: Built-in result formatting and processing optimization

## Setup

### 1. Get Brave Search API Key

1. Go to [Brave Search API](https://brave.com/search/api/)
2. Sign up for API access (Free tier available)
3. Get your API key from the dashboard

### 2. Add API Key to Environment

Edit `.env.local` and add:

```bash
BRAVE_API_KEY=your_actual_brave_api_key_here
```

### 3. Restart Development Server

```bash
pnpm dev
```

## Usage

### Automatic Search
Just ask questions that need current information:

```
"What's the latest news on AI?"
"Who won the Super Bowl 2024?"
"What is Claude Code?"
"How to deploy Next.js to Vercel?"
```

The system automatically detects these patterns and performs a web search.

### Manual Search Mode
1. Click the **magnifying glass icon** 🔍 in the chat input
2. Icon turns blue when search mode is ON
3. Type your query and send
4. All messages will trigger web search while enabled

### Command Trigger
Start your message with `/search`:

```
/search best practices for React Server Components
```

## How It Works

### Architecture

```
User Query
    ↓
Search Intent Detection
    ↓
Brave Search API (if needed)
    ↓
Format Results for LLM
    ↓
Gemini AI (with search context)
    ↓
Stream Response with Citations
    ↓
Display Sources Below Response
```

### Search Intent Detection

The system checks for:
- **Current info keywords**: "latest", "recent", "today", "2024", "2025"
- **Question patterns**: "what is", "who is", "how to", "where is"
- **Dynamic topics**: "news", "price", "weather", "stock"
- **Commands**: "/search", "search for", "look up"

It automatically **skips** search for:
- Coding queries (mentions of "function", "component", "typescript", etc.)
- File-related questions
- Project-specific development tasks

### Citation Rendering

Citations like `[1]`, `[2]` are automatically converted to:
- Styled, clickable buttons
- Blue accent color matching the theme
- Smooth scroll and highlight on click
- 2-second highlight duration

## File Structure

```
lib/search/
├── braveSearch.ts           # Brave API integration
├── detectSearchIntent.ts    # Auto-detection logic

components/chat/
├── SearchSources.tsx        # Source cards UI component
├── message-renderer.tsx     # Updated with citation support
├── enhanced-chat-interface.tsx  # Main chat with search state
└── chat-input.tsx          # Search toggle button

app/api/chat/
└── route.ts                # Updated to fetch and inject search results
```

## API Reference

### `braveSearch(query: string)`

Searches the web using Brave API.

**Returns:**
```typescript
{
  results: BraveSearchResult[],
  query: string,
  error?: string
}
```

### `shouldPerformSearch(query: string, manualMode?: boolean)`

Determines if a query should trigger search.

**Returns:** `boolean`

### `formatSearchResultsForLLM(results: BraveSearchResult[])`

Formats search results for Gemini AI context.

**Returns:** Formatted string with numbered sources

## Customization

### Adjust Search Threshold

In `lib/search/detectSearchIntent.ts`:

```typescript
// Default threshold is 50% confidence
return confidence >= 50;  // Change this value
```

### Change Number of Results

In `lib/search/braveSearch.ts`:

```typescript
url.searchParams.set('count', '8'); // Change from 8 to your preference
```

### Customize Source Card Styles

Edit `components/chat/SearchSources.tsx` to modify:
- Card background colors
- Hover effects
- Badge styles
- Layout spacing

### Modify Citation Appearance

Edit `components/chat/message-renderer.tsx` in the citation button className:

```typescript
className="inline-flex items-center ... bg-blue-500/20 ..."
```

## Troubleshooting

### No Search Results Appear

1. **Check API key**: Verify `BRAVE_API_KEY` is set in `.env.local`
2. **Check console**: Look for `[SEARCH]` logs in browser/server console
3. **Verify query**: Some queries may not trigger auto-detection
4. **Try manual mode**: Toggle search button to force search

### Citations Not Clickable

1. Citations must be in exact format: `[1]`, `[2]`, etc.
2. Check that AI is using the search results provided
3. Verify `onCitationClick` prop is passed to MessageRenderer

### API Rate Limits

- **Free tier**: Check Brave API dashboard for limits
- **Paid tier**: Upgrade for higher rate limits
- **Caching**: Consider implementing result caching for repeated queries

## Future Enhancements

- [ ] Open sources in Monaco editor pane (instead of new tab)
- [ ] Cache search results to reduce API calls
- [ ] Show "Searching..." indicator with loading animation
- [ ] Filter sources by content type (article/video/podcast)
- [ ] Add search history and suggestions
- [ ] Support image search results
- [ ] Multi-language search support
- [ ] Custom search domains whitelist/blacklist

## Related Documentation

- [Brave Search API Docs](https://brave.com/search/api/)
- [Gemini AI Function Calling](https://ai.google.dev/docs/function_calling)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

## Credits

- **Search API**: Brave Search
- **AI Model**: Google Gemini
- **Design Inspiration**: Perplexity.ai
- **Framework**: Next.js 14 + TypeScript

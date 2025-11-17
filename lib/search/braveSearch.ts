/**
 * Brave Search API Integration for OperaStudio
 * Provides premium web search capabilities with rich result formatting
 */

export interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  domain: string;
  favicon?: string;
  type?: 'article' | 'video' | 'podcast';
  age?: string; // e.g., "2 days ago"
  videoId?: string; // YouTube/Vimeo video ID
  thumbnailUrl?: string; // High-res thumbnail URL for videos
}

export interface BraveSearchResponse {
  results: BraveSearchResult[];
  query: string;
  error?: string;
}

/**
 * Detect content type from URL and metadata
 */
function detectContentType(url: string, title: string): 'article' | 'video' | 'podcast' {
  const lowerUrl = url.toLowerCase();
  const lowerTitle = title.toLowerCase();

  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') ||
      lowerUrl.includes('vimeo.com') || lowerTitle.includes('video')) {
    return 'video';
  }

  if (lowerUrl.includes('spotify.com') || lowerUrl.includes('podcast') ||
      lowerTitle.includes('podcast') || lowerUrl.includes('soundcloud.com')) {
    return 'podcast';
  }

  return 'article';
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

/**
 * Get favicon URL for a domain
 */
function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract Vimeo video ID from URL
 */
function extractVimeoVideoId(url: string): string | null {
  const pattern = /vimeo\.com\/(?:video\/)?(\d+)/;
  const match = url.match(pattern);
  return match ? match[1] : null;
}

/**
 * Get high-resolution thumbnail URL for YouTube video
 * Uses maxresdefault (highest quality, 1280x720) which may not always be available
 * The VideoCard component will handle fallback if image fails to load
 */
function getYouTubeThumbnail(videoId: string): string {
  // maxresdefault is the highest quality thumbnail (1280x720)
  // If not available, YouTube serves hqdefault (480x360) automatically
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

/**
 * Get thumbnail URL for Vimeo video
 */
function getVimeoThumbnail(videoId: string): string {
  // Vimeo requires API call, but we can use a placeholder or try oEmbed
  return `https://vumbnail.com/${videoId}.jpg`;
}

/**
 * Extract video ID and generate thumbnail URL for video results
 */
function getVideoMetadata(url: string): { videoId: string | null; thumbnailUrl: string | null } {
  const youtubeId = extractYouTubeVideoId(url);
  if (youtubeId) {
    return {
      videoId: youtubeId,
      thumbnailUrl: getYouTubeThumbnail(youtubeId),
    };
  }

  const vimeoId = extractVimeoVideoId(url);
  if (vimeoId) {
    return {
      videoId: vimeoId,
      thumbnailUrl: getVimeoThumbnail(vimeoId),
    };
  }

  return { videoId: null, thumbnailUrl: null };
}

/**
 * Search for videos using Brave Search API video endpoint
 */
async function braveVideoSearch(query: string, apiKey: string): Promise<BraveSearchResult[]> {
  try {
    const url = new URL('https://api.search.brave.com/res/v1/videos/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', '4'); // Fetch top 4 video results
    url.searchParams.set('search_lang', 'en');
    url.searchParams.set('country', 'us');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
    });

    if (!response.ok) {
      console.warn(`Brave video search error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();

    // Transform Brave video results to our format
    // Brave API returns results in data.results array
    const videoResults: BraveSearchResult[] = (data.results || [])
      .slice(0, 4)
      .map((result: any) => {
        const domain = extractDomain(result.url);
        const videoMetadata = getVideoMetadata(result.url);
        
        // Use thumbnail from API if available, otherwise use extracted metadata
        const apiThumbnail = result.thumbnail?.src || result.thumbnail;
        const thumbnailUrl = apiThumbnail || videoMetadata.thumbnailUrl || undefined;

        return {
          title: result.title || 'Untitled',
          url: result.url,
          description: result.description || result.snippet || '',
          domain,
          favicon: getFaviconUrl(domain),
          type: 'video' as const,
          age: result.age || undefined,
          videoId: videoMetadata.videoId || undefined,
          thumbnailUrl,
        };
      });

    console.log(`[Brave Video Search] Found ${videoResults.length} videos for query: ${query}`);
    return videoResults;
  } catch (error) {
    console.error('Brave video search error:', error);
    return [];
  }
}

/**
 * Search the web using Brave Search API
 * Also fetches video results and combines them
 */
export async function braveSearch(query: string): Promise<BraveSearchResponse> {
  const apiKey = process.env.BRAVE_API_KEY;

  if (!apiKey) {
    console.error('BRAVE_API_KEY not found in environment variables');
    return {
      results: [],
      query,
      error: 'Search API not configured'
    };
  }

  try {
    // Build web search URL
    const webSearchUrl = new URL('https://api.search.brave.com/res/v1/web/search');
    webSearchUrl.searchParams.set('q', query);
    webSearchUrl.searchParams.set('count', '8');
    webSearchUrl.searchParams.set('text_decorations', 'false');
    webSearchUrl.searchParams.set('search_lang', 'en');

    // Perform both web and video searches in parallel
    const [webResponse, videoResults] = await Promise.all([
      fetch(webSearchUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
      }).then(async (res) => {
        if (!res.ok) {
          throw new Error(`Brave API error: ${res.status} ${res.statusText}`);
        }
        return res.json();
      }),
      braveVideoSearch(query, apiKey),
    ]);

    // Transform web results to our format
    const webResults: BraveSearchResult[] = (webResponse.web?.results || [])
      .slice(0, 8)
      .map((result: any) => {
        const domain = extractDomain(result.url);
        const contentType = detectContentType(result.url, result.title || '');
        
        // Extract video metadata if it's a video
        let videoMetadata: { videoId: string | null; thumbnailUrl: string | null } = { videoId: null, thumbnailUrl: null };
        if (contentType === 'video') {
          videoMetadata = getVideoMetadata(result.url);
        }

        return {
          title: result.title || 'Untitled',
          url: result.url,
          description: result.description || result.snippet || '',
          domain,
          favicon: getFaviconUrl(domain),
          type: contentType,
          age: result.age || undefined,
          videoId: videoMetadata.videoId || undefined,
          thumbnailUrl: videoMetadata.thumbnailUrl || undefined,
        };
      });

    // Combine web and video results (videos first, then web results)
    const allResults = [...videoResults, ...webResults];

    return {
      results: allResults,
      query,
    };
  } catch (error) {
    console.error('Brave search error:', error);
    return {
      results: [],
      query,
      error: error instanceof Error ? error.message : 'Search failed',
    };
  }
}

/**
 * Format search results for LLM context
 * Provides longer snippets (500 chars) and notes that URLs are available in split view
 */
export function formatSearchResultsForLLM(results: BraveSearchResult[]): string {
  if (results.length === 0) {
    return '';
  }

  const formatted = results
    .map((result, index) => {
      // Increase snippet length from 200 to 500 characters for better context
      const snippet = result.description.slice(0, 500);
      const truncated = result.description.length > 500 ? '...' : '';
      return `[${index + 1}] Title: "${result.title}" | URL: ${result.url} | Snippet: "${snippet}${truncated}"`;
    })
    .join('\n');

  return `[Search Results]\n${formatted}\n\nNote: These URLs are automatically opened in the split view (right pane) for visual reference, similar to how code files are displayed. You can reference them by their citation numbers [1], [2], etc.`;
}

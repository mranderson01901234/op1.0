"use client";

import { ExternalLink, RefreshCw, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface WebViewerProps {
  url: string;
  title: string;
}

/**
 * Convert YouTube watch URLs to embeddable format
 * Handles: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID
 */
function getEmbeddableUrl(url: string): { url: string; isEmbed: boolean } {
  try {
    const urlObj = new URL(url);

    // YouTube video - convert to embed
    if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
      const videoId = urlObj.searchParams.get('v');
      if (videoId) {
        return {
          url: `https://www.youtube.com/embed/${videoId}`,
          isEmbed: true
        };
      }
    }

    // YouTube short link - convert to embed
    if (urlObj.hostname === 'youtu.be') {
      const videoId = urlObj.pathname.slice(1); // Remove leading /
      if (videoId) {
        return {
          url: `https://www.youtube.com/embed/${videoId}`,
          isEmbed: true
        };
      }
    }

    // YouTube Shorts - convert to embed
    if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.startsWith('/shorts/')) {
      const videoId = urlObj.pathname.split('/shorts/')[1];
      if (videoId) {
        return {
          url: `https://www.youtube.com/embed/${videoId}`,
          isEmbed: true
        };
      }
    }

    // Return original URL if no conversion needed
    return { url, isEmbed: false };
  } catch (error) {
    // If URL parsing fails, return original
    return { url, isEmbed: false };
  }
}

export function WebViewer({ url, title }: WebViewerProps) {
  const [key, setKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const { url: embeddableUrl, isEmbed } = getEmbeddableUrl(url);

  const handleRefresh = () => {
    setIsLoading(true);
    setHasError(false);
    setKey(prev => prev + 1);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border">
        <button
          onClick={handleRefresh}
          className="p-1.5 hover:bg-accent rounded-md transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1 px-3 py-1.5 bg-background rounded-md text-sm text-muted-foreground truncate border border-border/50">
          {url}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 hover:bg-accent rounded-md transition-colors"
          title="Open in new tab"
        >
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </a>
      </div>

      {/* Loading indicator */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <p className="text-sm text-muted-foreground">Loading {title}...</p>
          </div>
        </div>
      )}

      {/* Error state - when iframe is blocked */}
      {hasError && (
        <div className="flex-1 flex items-center justify-center bg-background p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-yellow-500/10 rounded-full">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Content Cannot Be Embedded</h3>
              <p className="text-sm text-muted-foreground">
                This website prevents embedding for security reasons. You can still view the content by opening it in a new tab.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </a>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md transition-colors text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Web content iframe */}
      {!hasError && (
        <div className="flex-1 relative overflow-hidden">
          <iframe
            key={key}
            src={embeddableUrl}
            className="w-full h-full border-0"
            onLoad={handleLoad}
            onError={handleError}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-presentation"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            title={title}
          />
        </div>
      )}
    </div>
  );
}

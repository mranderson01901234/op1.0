'use client';

import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BraveSearchResult } from '@/lib/search/braveSearch';

interface SourceWithIndex {
  source: BraveSearchResult;
  originalIndex: number;
}

interface HorizontalSourceCardsProps {
  sources: (BraveSearchResult | SourceWithIndex)[];
  onSourceClick: (url: string, displayIndex: number, originalIndex?: number) => void;
  highlightedCitation?: number | null;
}

/**
 * HorizontalSourceCards - Vertical scrollable source cards
 * Shows 3 cards at a time with vertical scroll functionality
 * Professional card design with thumbnails, titles, and descriptions
 */
export default function HorizontalSourceCards({
  sources,
  onSourceClick,
  highlightedCitation,
}: HorizontalSourceCardsProps) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="w-full mb-8">
      {/* Vertical scrollable container - shows 3 cards at a time */}
      {/* Height: 3 cards (120px each) + 2 gaps (12px each) = 384px */}
      <div className="overflow-y-auto" style={{ maxHeight: '384px' }}>
        <div className="flex flex-col gap-3 pr-1">
          {sources.map((item, index) => {
            const sourceData = 'source' in item ? item.source : item;
            const originalIndex = 'originalIndex' in item ? item.originalIndex : index;
            return (
              <VerticalSourceCard
                key={index}
                source={sourceData}
                index={originalIndex}
                displayIndex={index}
                isHighlighted={highlightedCitation === originalIndex}
                onClick={(url) => onSourceClick(url, index, originalIndex)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface VerticalSourceCardProps {
  source: BraveSearchResult;
  index: number; // Original citation index
  displayIndex: number; // Display position
  isHighlighted?: boolean;
  onClick: (url: string) => void;
}

/**
 * Get favicon URL for a domain
 */
function getFaviconUrl(domain: string, size: number = 32): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

function VerticalSourceCard({
  source,
  index,
  displayIndex,
  isHighlighted,
  onClick,
}: VerticalSourceCardProps) {
  const faviconUrl = source.favicon || getFaviconUrl(source.domain, 32);
  const thumbnailUrl = source.thumbnailUrl;

  return (
    <button
      id={`source-${index}`}
      onClick={() => onClick(source.url)}
      className={cn(
        'group relative w-full text-left rounded-lg border transition-all duration-200',
        'bg-[#1a1a1a] hover:bg-[#1f1f1f]',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0a]',
        isHighlighted
          ? 'border-blue-500/50 ring-2 ring-blue-500/20'
          : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
      )}
    >
      <div className="flex gap-3 p-2.5">
        {/* Thumbnail - Larger, fills more space */}
        <div className="relative flex-shrink-0 w-[96px] h-[96px] rounded-md overflow-hidden bg-[#141414] border border-[#2a2a2a]">
          {thumbnailUrl ? (
            // Use provided thumbnail (for videos/articles with images)
            <img
              src={thumbnailUrl}
              alt={source.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to favicon if thumbnail fails
                const img = e.currentTarget;
                img.src = faviconUrl;
                img.className = 'w-full h-full object-contain p-4';
              }}
            />
          ) : (
            // Use favicon/logo
            <div className="w-full h-full flex items-center justify-center p-4">
              <img
                src={faviconUrl}
                alt={source.domain}
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Final fallback: show domain initial
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const initial = source.domain.charAt(0).toUpperCase();
                    parent.innerHTML = `
                      <div class="w-full h-full flex items-center justify-center">
                        <span class="text-[#6e6e70] text-2xl font-semibold">${initial}</span>
                      </div>
                    `;
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Content - Right side */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {/* Domain name */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[11px] font-medium text-[#6e6e70] uppercase tracking-wide truncate">
              {source.domain}
            </span>
            {source.age && (
              <>
                <span className="text-[#4e4f57]">·</span>
                <span className="text-[10px] text-[#6e6e70]">{source.age}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h3 className="text-[14px] font-semibold text-white mb-1.5 line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
            {source.title}
          </h3>

          {/* Description */}
          <p className="text-[12px] text-[#a0a0a0] line-clamp-2 leading-relaxed">
            {source.description}
          </p>
        </div>

        {/* External link icon - appears on hover */}
        <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-4 h-4 text-[#6e6e70] group-hover:text-[#a0a0a0]" />
        </div>
      </div>
    </button>
  );
}

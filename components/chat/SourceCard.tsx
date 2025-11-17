'use client';

import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BraveSearchResult } from '@/lib/search/braveSearch';

interface SourceCardProps {
  source: BraveSearchResult;
  index: number;
  isHighlighted?: boolean;
  onClick: (url: string, index: number) => void;
}

/**
 * Get thumbnail/logo for a source
 * Uses domain-based logo fetching similar to Perplexity
 */
function getSourceThumbnail(domain: string): string {
  // Use Clearbit Logo API or similar service
  // Fallback to favicon if no logo available
  return `https://logo.clearbit.com/${domain}`;
}

export default function SourceCard({ source, index, isHighlighted, onClick }: SourceCardProps) {
  const thumbnailUrl = getSourceThumbnail(source.domain);

  // Content type badge
  const getBadge = () => {
    if (source.type === 'video') return { emoji: '📺', label: 'youtube', color: 'text-red-400' };
    if (source.type === 'podcast') return { emoji: '🎧', label: 'podcast', color: 'text-purple-400' };
    return { emoji: '', label: source.domain, color: 'text-gray-500' };
  };

  const badge = getBadge();

  return (
    <div
      id={`source-${index}`}
      className={cn(
        'group relative p-4 rounded-lg border transition-all duration-200 cursor-pointer',
        isHighlighted
          ? 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/30'
          : 'bg-transparent border-gray-800 hover:border-gray-700 hover:bg-white/5'
      )}
      onClick={() => onClick(source.url, index)}
    >
      <div className="flex gap-4">
        {/* Thumbnail - larger, high-quality logo */}
        <div className="flex-shrink-0">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#1a1a1a] border border-gray-800 flex items-center justify-center p-2">
            <img
              src={thumbnailUrl}
              alt={source.domain}
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback to high-res favicon
                e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${source.domain}&sz=128`;
                e.currentTarget.className = 'w-12 h-12 object-contain';
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-[15px] font-semibold text-white mb-1.5 line-clamp-2 group-hover:text-blue-400 transition-colors leading-snug">
            {source.title}
          </h3>

          {/* Description */}
          <p className="text-[13px] text-gray-400 line-clamp-2 mb-2.5 leading-relaxed">
            {source.description}
          </p>

          {/* Footer with domain and badge */}
          <div className="flex items-center gap-2">
            <span className={cn('text-[12px] font-medium', badge.color)}>
              {badge.emoji && <span className="mr-1">{badge.emoji}</span>}
              {badge.label}
            </span>
            {source.age && (
              <>
                <span className="text-gray-800">·</span>
                <span className="text-[12px] text-gray-500">{source.age}</span>
              </>
            )}
          </div>
        </div>

        {/* Citation number */}
        <div className="flex-shrink-0">
          <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-semibold text-gray-400">
            {index + 1}
          </div>
        </div>

        {/* External link icon on hover */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-4 h-4 text-gray-500" />
        </div>
      </div>
    </div>
  );
}

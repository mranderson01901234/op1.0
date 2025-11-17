'use client';

import { BraveSearchResult } from '@/lib/search/braveSearch';
import { ExternalLink, FileText, Video, Headphones } from 'lucide-react';
import { useState } from 'react';

interface SearchSourcesProps {
  results: BraveSearchResult[];
  onSourceClick?: (url: string, index: number) => void;
  highlightedIndex?: number | null;
}

const CONTENT_TYPE_CONFIG = {
  video: {
    icon: Video,
    label: 'Video',
    emoji: '📺',
    color: 'text-red-400',
  },
  podcast: {
    icon: Headphones,
    label: 'Podcast',
    emoji: '🎧',
    color: 'text-purple-400',
  },
  article: {
    icon: FileText,
    label: 'Article',
    emoji: '📰',
    color: 'text-blue-400',
  },
};

export default function SearchSources({
  results,
  onSourceClick,
  highlightedIndex,
}: SearchSourcesProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 animate-fadeIn">
      <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
        <span>Sources</span>
        <span className="text-xs text-gray-600">({results.length})</span>
      </h3>

      <div className="space-y-2">
        {results.map((result, index) => {
          const contentConfig = CONTENT_TYPE_CONFIG[result.type || 'article'];
          const Icon = contentConfig.icon;
          const isHighlighted = highlightedIndex === index;
          const isHovered = hoveredIndex === index;

          return (
            <div
              key={index}
              id={`source-${index}`}
              className={`
                group relative rounded-lg border transition-all duration-200
                ${isHighlighted
                  ? 'bg-blue-500/10 border-blue-500/50 ring-2 ring-blue-500/30'
                  : 'bg-[#1a1a1a] border-gray-800 hover:border-gray-700'
                }
                ${isHovered ? 'shadow-lg shadow-black/20' : ''}
              `}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="p-4">
                {/* Header: Domain + Badge */}
                <div className="flex items-center gap-2 mb-2">
                  {result.favicon && (
                    <img
                      src={result.favicon}
                      alt=""
                      className="w-4 h-4 rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <span className="text-xs text-gray-500 font-medium">
                    {result.domain}
                  </span>
                  <span
                    className={`ml-auto text-xs flex items-center gap-1 ${contentConfig.color}`}
                  >
                    <span>{contentConfig.emoji}</span>
                    <span className="hidden sm:inline">{contentConfig.label}</span>
                  </span>
                </div>

                {/* Citation Number */}
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
                  {index + 1}
                </div>

                {/* Title */}
                <h4 className="text-sm font-semibold text-gray-200 mb-2 pr-8 line-clamp-2 group-hover:text-white transition-colors">
                  {result.title}
                </h4>

                {/* Description */}
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                  {result.description}
                </p>

                {/* Action Button */}
                <button
                  onClick={() => onSourceClick?.(result.url, index)}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium group/btn"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>
                    {result.type === 'video' ? 'Watch Video' :
                     result.type === 'podcast' ? 'Listen' :
                     'View Article'}
                  </span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                </button>

                {/* Age indicator if available */}
                {result.age && (
                  <div className="absolute bottom-2 right-2 text-xs text-gray-600">
                    {result.age}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

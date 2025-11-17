'use client';

import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { BraveSearchResult } from '@/lib/search/braveSearch';

interface SourcesDropdownProps {
  sources: BraveSearchResult[];
  onSourceClick: (url: string, index: number) => void;
}

export default function SourcesDropdown({ sources, onSourceClick }: SourcesDropdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
      >
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
        <span>Reviewed {sources.length} sources</span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-2 pl-6">
          {sources.map((source, index) => {
            const getIcon = () => {
              if (source.favicon) {
                return (
                  <img
                    src={source.favicon}
                    alt=""
                    className="w-4 h-4 rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                );
              }
              return <div className="w-4 h-4 rounded bg-gray-700" />;
            };

            return (
              <div
                key={index}
                className="group flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => onSourceClick(source.url, index)}
              >
                {getIcon()}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-300 group-hover:text-white transition-colors truncate">
                    {source.title}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {source.domain}
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

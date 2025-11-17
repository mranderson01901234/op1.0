'use client';

import { Play, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BraveSearchResult } from '@/lib/search/braveSearch';

interface CompactVideoCardsProps {
  videos: BraveSearchResult[];
  onVideoClick: (url: string, index: number) => void;
}

/**
 * CompactVideoCards - YouTube-style vertical list of video cards for Answer page
 * Shows videos in a vertical scrolling list similar to YouTube search results
 */
export default function CompactVideoCards({ videos, onVideoClick }: CompactVideoCardsProps) {
  // Filter to only video results
  const videoResults = videos.filter((result) => result.type === 'video');

  if (videoResults.length === 0) {
    return null;
  }

  return (
    <div className="w-full mb-6">
      {/* Vertical list container */}
      <div className="flex flex-col gap-3">
        {videoResults.map((video, index) => (
          <CompactVideoCard
            key={index}
            video={video}
            index={index}
            onClick={onVideoClick}
          />
        ))}
      </div>
    </div>
  );
}

interface CompactVideoCardProps {
  video: BraveSearchResult;
  index: number;
  onClick: (url: string, index: number) => void;
}

function CompactVideoCard({ video, index, onClick }: CompactVideoCardProps) {
  const thumbnailUrl = video.thumbnailUrl || video.favicon || '';
  const isYouTube = video.domain.includes('youtube.com') || video.domain.includes('youtu.be');

  return (
    <div
      className={cn(
        'group relative flex gap-3 w-full rounded-xl overflow-hidden',
        'bg-gradient-to-br from-[#1a1a1a] to-[#151515]',
        'border border-gray-800/80 hover:border-gray-700',
        'cursor-pointer transition-all duration-200',
        'hover:shadow-xl hover:shadow-black/20 p-3'
      )}
      onClick={() => onClick(video.url, index)}
    >
      {/* Thumbnail on the left - YouTube style */}
      <div className="relative w-64 flex-shrink-0 h-36 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden">
        {thumbnailUrl ? (
          <>
            <img
              src={thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover opacity-95 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105"
              onError={(e) => {
                // Fallback to gradient with play icon
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg">
                      <div class="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                        <svg class="w-6 h-6 text-gray-400 ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  `;
                }
              }}
            />
            {/* Premium play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
              <div className="w-12 h-12 rounded-full bg-red-600/90 backdrop-blur-sm flex items-center justify-center shadow-2xl shadow-red-500/30 group-hover:bg-red-600 group-hover:scale-110 transition-all duration-200 border border-white/20">
                <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center">
              <Play className="w-6 h-6 text-red-400" />
            </div>
          </div>
        )}

        {/* Duration badge */}
        {video.age && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/90 backdrop-blur-sm text-white text-[10px] font-bold border border-white/10">
            {video.age}
          </div>
        )}
      </div>

      {/* Video Info on the right */}
      <div className="flex-1 flex flex-col min-w-0 py-1">
        {/* Title */}
        <h3 className="text-[15px] font-semibold text-white mb-2 line-clamp-2 group-hover:text-red-400 transition-colors leading-snug">
          {video.title}
        </h3>

        {/* Platform badge */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 rounded overflow-hidden bg-gray-800/50 flex items-center justify-center">
            {video.favicon && (
              <img
                src={video.favicon}
                alt=""
                className="w-full h-full object-contain"
                onError={(e) => e.currentTarget.style.display = 'none'}
              />
            )}
          </div>
          <span className="text-[11px] font-medium tracking-wide text-gray-400">
            {isYouTube ? 'YouTube' : video.domain}
          </span>
        </div>

        {/* Description if available */}
        {video.description && (
          <p className="text-[13px] text-gray-400 line-clamp-2 leading-relaxed">
            {video.description}
          </p>
        )}
      </div>

      {/* Watch indicator on hover */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
}


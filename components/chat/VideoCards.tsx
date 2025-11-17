'use client';

import { Play, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BraveSearchResult } from '@/lib/search/braveSearch';

interface VideoCardsProps {
  videos: BraveSearchResult[];
  onVideoClick: (url: string, index: number) => void;
}

/**
 * VideoCards - Horizontal scrollable video cards with high-res thumbnails
 * Shows up to 4 video cards in a horizontal scrollable format
 */
export default function VideoCards({ videos, onVideoClick }: VideoCardsProps) {
  // Filter to only video results and limit to 4
  const videoResults = videos
    .filter((result) => result.type === 'video')
    .slice(0, 4);

  if (videoResults.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
          <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-gray-400 text-sm">No videos found for this search.</p>
        <p className="text-gray-500 text-xs mt-2">Try searching for topics that might have video content.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Horizontal scrollable container */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin">
        <div className="flex gap-4 min-w-max">
          {videoResults.map((video, index) => (
            <VideoCard
              key={index}
              video={video}
              index={index}
              onClick={onVideoClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface VideoCardProps {
  video: BraveSearchResult;
  index: number;
  onClick: (url: string, index: number) => void;
}

function VideoCard({ video, index, onClick }: VideoCardProps) {
  const thumbnailUrl = video.thumbnailUrl || video.favicon || '';
  const isYouTube = video.domain.includes('youtube.com') || video.domain.includes('youtu.be');

  return (
    <div
      className={cn(
        'group relative flex-shrink-0 w-[320px] rounded-xl overflow-hidden',
        'bg-[#1a1a1a] border border-gray-800',
        'cursor-pointer transition-all duration-200',
        'hover:border-gray-700 hover:shadow-lg hover:scale-[1.02]'
      )}
      onClick={() => onClick(video.url, index)}
    >
      {/* Thumbnail Container */}
      <div className="relative w-full aspect-video bg-gray-900 overflow-hidden">
        {thumbnailUrl ? (
          <>
            <img
              src={thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                // Fallback to a placeholder if thumbnail fails to load
                e.currentTarget.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Crect fill='%231a1a1a' width='320' height='180'/%3E%3Ctext fill='%23666' font-family='system-ui' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EVideo%3C/text%3E%3C/svg%3E`;
              }}
            />
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:bg-white group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 text-black ml-1" fill="black" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <Play className="w-12 h-12 text-gray-600" />
          </div>
        )}

        {/* Duration badge (if available) - could be added later */}
        {video.age && (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-white text-xs font-medium">
            {video.age}
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-[15px] font-semibold text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors leading-snug">
          {video.title}
        </h3>

        {/* Description */}
        <p className="text-[13px] text-gray-400 line-clamp-2 mb-3 leading-relaxed">
          {video.description}
        </p>

        {/* Footer with domain */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {video.favicon && (
              <img
                src={video.favicon}
                alt={video.domain}
                className="w-4 h-4 rounded"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <span className="text-[12px] text-gray-500 font-medium">
              {isYouTube ? 'YouTube' : video.domain}
            </span>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}


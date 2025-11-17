'use client';

import { Video, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaButtonsProps {
  hasVideos: boolean;
  hasPodcasts: boolean;
  onWatchClick: () => void;
  onListenClick: () => void;
}

/**
 * Media action buttons shown in the Answer tab header
 * Provides quick access to video and audio content
 */
export default function MediaButtons({
  hasVideos,
  hasPodcasts,
  onWatchClick,
  onListenClick,
}: MediaButtonsProps) {
  if (!hasVideos && !hasPodcasts) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {hasVideos && (
        <button
          onClick={onWatchClick}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            'bg-[#2a2b30] hover:bg-[#32333a] text-gray-300 hover:text-white',
            'border border-gray-700 hover:border-gray-600'
          )}
        >
          <Video className="w-4 h-4" />
          <span>Watch</span>
        </button>
      )}

      {hasPodcasts && (
        <button
          onClick={onListenClick}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            'bg-[#2a2b30] hover:bg-[#32333a] text-gray-300 hover:text-white',
            'border border-gray-700 hover:border-gray-600'
          )}
        >
          <Headphones className="w-4 h-4" />
          <span>Listen</span>
        </button>
      )}
    </div>
  );
}

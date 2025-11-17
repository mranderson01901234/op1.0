'use client';

import { FileText, Image as ImageIcon, Video, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';

type SearchTab = 'answer' | 'images' | 'videos' | 'audio';

interface SearchTabsProps {
  activeTab: SearchTab;
  onTabChange: (tab: SearchTab) => void;
  hasImages?: boolean;
  hasVideos?: boolean;
  hasAudio?: boolean;
  isWebSearch?: boolean; // Always show Videos tab for web searches
}

const tabs = [
  { id: 'answer' as SearchTab, label: 'Answer', icon: FileText, alwaysShow: true },
  { id: 'images' as SearchTab, label: 'Images', icon: ImageIcon, alwaysShow: false },
  { id: 'videos' as SearchTab, label: 'Videos', icon: Video, alwaysShow: false },
  { id: 'audio' as SearchTab, label: 'Listen', icon: Headphones, alwaysShow: false },
];

export default function SearchTabs({
  activeTab,
  onTabChange,
  hasImages = false,
  hasVideos = false,
  hasAudio = false,
  isWebSearch = false,
}: SearchTabsProps) {
  // For web searches, always show Videos tab
  const availability = {
    answer: true,
    images: hasImages,
    videos: isWebSearch || hasVideos, // Always show for web searches
    audio: hasAudio,
  };

  return (
    <div className="border-b border-gray-800 mb-6">
      <div className="flex gap-1">
        {tabs.map((tab) => {
          // Only show tab if it's always shown or has content
          if (!tab.alwaysShow && !availability[tab.id]) {
            return null;
          }

          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-150 relative',
                isActive
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

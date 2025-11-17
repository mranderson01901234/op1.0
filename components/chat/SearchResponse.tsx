'use client';

import { useState } from 'react';
import SearchTabs from './SearchTabs';
import SearchThinking from './SearchThinking';
import SourcesDropdown from './SourcesDropdown';
import RelatedQuestions from './RelatedQuestions';
import VideoCards from './VideoCards';
import CompactVideoCards from './CompactVideoCards';
import HorizontalSourceCards from './HorizontalSourceCards';
import { MessageRenderer } from './message-renderer';
import type { BraveSearchResult } from '@/lib/search/braveSearch';

interface SearchResponseProps {
  query: string;
  condensedQuery?: string;
  searchResults: BraveSearchResult[];
  aiResponse: string;
  isStreaming: boolean;
  onCitationClick: (index: number) => void;
  onSourceClick: (url: string, index: number) => void;
  onRelatedQuestionClick: (question: string) => void;
  highlightedCitation?: number | null;
  thinkingStage?: 'searching' | 'reviewing' | 'analyzing' | 'done';
  searchQueries?: string[];
}

/**
 * Complete Perplexity-style search response
 * Includes header, tabs, thinking UI, sources, and related questions
 */
export default function SearchResponse({
  query,
  condensedQuery,
  searchResults,
  aiResponse,
  isStreaming,
  onCitationClick,
  onSourceClick,
  onRelatedQuestionClick,
  highlightedCitation,
  thinkingStage = 'done',
  searchQueries = [],
}: SearchResponseProps) {
  console.log('[SearchResponse] Rendering with:', {
    query,
    resultCount: searchResults?.length,
    isStreaming,
    thinkingStage
  });

  // Check if we have different content types
  const hasVideos = searchResults.some(r => r.type === 'video');
  const hasPodcasts = searchResults.some(r => r.type === 'podcast');

  // Default to answer tab (videos now show on answer page)
  const [activeTab, setActiveTab] = useState<'answer' | 'images' | 'videos' | 'audio'>('answer');

  // Generate related questions based on the query
  const generateRelatedQuestions = (): string[] => {
    // In a real implementation, these could come from the LLM or be generated
    // For now, we'll show some generic related questions
    const relatedQuestions = [
      `Key AI safety developments this week`,
      `Major product launches and company moves in AI today`,
      `Regulatory or government actions on AI in the last month`,
      `Breakthrough research papers or benchmarks published recently`,
      `How AI is affecting jobs and hiring for new graduates`,
    ];

    return relatedQuestions;
  };

  const relatedQuestions = generateRelatedQuestions();

  return (
    <div className="w-full">
      {/* Tabbed Navigation */}
      <SearchTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasVideos={hasVideos}
        hasAudio={hasPodcasts}
        isWebSearch={true} // Always show Videos tab for web searches
      />

      {/* Thinking/Processing UI */}
      {isStreaming && (
        <SearchThinking
          stage={thinkingStage}
          queries={searchQueries}
          sourceCount={searchResults.length}
        />
      )}

      {/* Videos Tab Content */}
      {activeTab === 'videos' && !isStreaming && (
        <div className="mb-8">
          <VideoCards
            videos={searchResults}
            onVideoClick={onSourceClick}
          />
        </div>
      )}

      {/* Answer Tab Content */}
      {activeTab === 'answer' && (
        <>
          {/* Sources Dropdown */}
          {searchResults.length > 0 && !isStreaming && (
            <SourcesDropdown
              sources={searchResults}
              onSourceClick={onSourceClick}
            />
          )}

          {/* AI Response with Citations */}
          {aiResponse && (
            <div className="prose prose-invert max-w-none mb-6">
              <MessageRenderer
                content={aiResponse}
                isUser={false}
                onCitationClick={onCitationClick}
                onSourceClick={onSourceClick}
                searchResults={searchResults}
              />
            </div>
          )}

          {/* Compact Video Cards - Horizontal scrollable on Answer page */}
          {hasVideos && !isStreaming && (
            <CompactVideoCards
              videos={searchResults}
              onVideoClick={onSourceClick}
            />
          )}

          {/* Horizontal Source Cards - Fixed size, scrollable (exclude videos, shown separately) */}
          {searchResults.length > 0 && !isStreaming && (
            <HorizontalSourceCards
              sources={searchResults
                .map((source, idx) => ({ source, originalIndex: idx }))
                .filter((item) => item.source.type !== 'video')}
              onSourceClick={(url, displayIndex, originalIndex) => {
                onSourceClick(url, originalIndex ?? displayIndex);
              }}
              highlightedCitation={highlightedCitation}
            />
          )}

          {/* Related Questions */}
          {!isStreaming && aiResponse && (
            <RelatedQuestions
              questions={relatedQuestions}
              onQuestionClick={onRelatedQuestionClick}
            />
          )}
        </>
      )}

      {/* Images Tab Content - Placeholder */}
      {activeTab === 'images' && !isStreaming && (
        <div className="py-8 text-center text-gray-500">
          <p>Images feature coming soon.</p>
        </div>
      )}

      {/* Audio Tab Content - Placeholder */}
      {activeTab === 'audio' && !isStreaming && (
        <div className="py-8 text-center text-gray-500">
          <p>Audio feature coming soon.</p>
        </div>
      )}
    </div>
  );
}

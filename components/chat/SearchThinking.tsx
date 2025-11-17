'use client';

import { Search, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SearchThinkingProps {
  stage: 'searching' | 'reviewing' | 'analyzing' | 'done';
  queries?: string[];
  sourceCount?: number;
}

export default function SearchThinking({ stage, queries = [], sourceCount = 0 }: SearchThinkingProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  if (stage === 'done') {
    return null;
  }

  const stageMessages = {
    searching: 'Searching',
    reviewing: `Reviewing sources · ${sourceCount}`,
    analyzing: 'Surveying recent AI developments to summarize the latest news and trends for quick, clear updates.',
  };

  return (
    <div className="mb-6 space-y-3">
      {/* Main status */}
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{stageMessages[stage]}{stage !== 'analyzing' && dots}</span>
      </div>

      {/* Search queries being used */}
      {queries.length > 0 && stage === 'searching' && (
        <div className="ml-6 space-y-1.5">
          <div className="text-xs text-gray-600 mb-2">Searching</div>
          {queries.map((query, index) => (
            <div key={index} className="flex items-center gap-2 text-xs text-gray-500">
              <Search className="w-3 h-3" />
              <span className="font-mono">{query}</span>
            </div>
          ))}
        </div>
      )}

      {/* Progress indicator for reviewing */}
      {stage === 'reviewing' && sourceCount > 0 && (
        <div className="ml-6 text-xs text-gray-600">
          Reviewing sources · {sourceCount}
        </div>
      )}
    </div>
  );
}

'use client';

/**
 * SearchHeader - Condensed query title shown at top of search results
 * Mimics Perplexity's summarized search query display
 */

interface SearchHeaderProps {
  originalQuery: string;
  condensedQuery?: string;
}

export default function SearchHeader({ originalQuery, condensedQuery }: SearchHeaderProps) {
  // Use condensed query if provided, otherwise use original
  const displayQuery = condensedQuery || originalQuery;

  return (
    <div className="mb-6">
      <h1 className="text-3xl font-normal text-white tracking-tight">
        {displayQuery}
      </h1>
    </div>
  );
}

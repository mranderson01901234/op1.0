"use client";

import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";

interface MessageRendererProps {
  content: string;
  isUser: boolean;
  onCitationClick?: (citationIndex: number) => void;
  onSourceClick?: (url: string, index: number) => void;
  searchResults?: any[]; // Pass search results to render inline source links
}

/**
 * Remove common TLDs from domain names for cleaner display
 * Examples: wikipedia.org -> wikipedia, nytimes.com -> nytimes
 */
const cleanDomain = (domain: string): string => {
  return domain
    .replace('www.', '')
    .replace(/\.(com|org|net|edu|gov|io|co|ai|dev|app)$/i, '');
};

/**
 * Process content to convert citation markers [1], [2] into clickable links with domain names
 */
const processContentWithCitations = (text: string, searchResults?: any[]): string => {
  // First, move periods from after citations to before them
  // Examples: "sentence[1]." -> "sentence.[1]", "text[2], [3]." -> "text.[2], [3]"
  let processedText = text.replace(/(\[\d+\](?:,?\s*\[\d+\])*)\./g, '.$1');

  if (!searchResults || searchResults.length === 0) {
    // Fallback to numbered citations if no search results
    return processedText.replace(/\[(\d+)\]/g, (match, num) => {
      return `[${match}](#citation-${num})`;
    });
  }

  // Replace [1], [2], etc. with domain-based citations like Perplexity
  return processedText.replace(/\[(\d+)\]/g, (match, num) => {
    const index = parseInt(num) - 1;
    const result = searchResults[index];
    if (result) {
      // Use domain name from search result and clean it
      const domain = result.domain || new URL(result.url).hostname.replace('www.', '');
      const cleanedDomain = cleanDomain(domain);
      return `[${cleanedDomain}](#citation-${num})`;
    }
    return `[${match}](#citation-${num})`;
  });
};

export const MessageRenderer = memo(function MessageRenderer({ 
  content, 
  isUser, 
  onCitationClick, 
  onSourceClick, 
  searchResults 
}: MessageRendererProps) {
  // Memoize expensive citation processing
  const processedContent = useMemo(() => {
    if (isUser) return content;
    return processContentWithCitations(content, searchResults);
  }, [content, isUser, searchResults]);

  if (isUser) {
    return (
      <div className="max-w-[80%] rounded-2xl bg-gradient-card px-5 py-4 shadow-linear-sm">
        <div className="whitespace-pre-wrap break-words text-[16px] leading-[1.6] text-white">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="prose prose-invert max-w-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks
          code({ node, className, children, ...props }: any) {
            const inline = !className;
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "text";

            if (!inline) {
              const codeString = String(children).replace(/\n$/, "");
              return <CodeBlock language={language} code={codeString} />;
            }

            return (
              <code
                className="rounded border border-[#2e2f37] bg-[#23242a] px-1.5 py-0.5 font-mono text-[14px] text-[#e6e6e7]"
                {...props}
              >
                {children}
              </code>
            );
          },
          // Headings
          h1: ({ children }) => (
            <h1 className="mb-4 mt-8 text-2xl font-semibold tracking-tight text-white first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-4 mt-8 text-[20px] font-semibold tracking-[-0.01em] text-white first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-3 mt-6 text-[16px] font-semibold text-[#e6e6e7] first:mt-0">
              {children}
            </h3>
          ),
          // Paragraphs
          p: ({ children }) => (
            <p className="my-3 text-[16px] leading-[1.7] text-gray-400">
              {children}
            </p>
          ),
          // Bold
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          // Lists
          ul: ({ children }) => (
            <ul className="my-4 space-y-2.5 pl-0 text-gray-400">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 ml-5 list-decimal space-y-2.5 text-gray-400">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="relative pl-6 text-[16px] leading-[1.6] before:absolute before:left-2 before:font-bold before:text-[#6e6e70] before:content-['•']">
              {children}
            </li>
          ),
          // Tables
          table: ({ children }) => (
            <div className="my-4 overflow-hidden rounded-lg border border-[#2e2f37]">
              <table className="w-full">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#1a1a1a]">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#2e2f37]">{children}</tbody>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-sm font-semibold text-white">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-sm text-gray-400">{children}</td>
          ),
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-2 border-gray-700 pl-4 italic text-gray-500">
              {children}
            </blockquote>
          ),
          // Links - handle citations specially
          a: ({ children, href }) => {
            // Check if this is a citation link
            if (href && href.startsWith('#citation-')) {
              const citationNum = parseInt(href.replace('#citation-', ''));
              const index = citationNum - 1;
              const result = searchResults?.[index];

              // Get favicon URL - use Google's favicon service as fallback
              const faviconUrl = result?.favicon ||
                `https://www.google.com/s2/favicons?domain=${result?.domain || ''}&sz=32`;

              return (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    // Open the URL in the right panel
                    if (result?.url && onSourceClick) {
                      onSourceClick(result.url, index);
                    }
                    // Also trigger citation click for highlighting
                    onCitationClick?.(index);
                  }}
                  className="inline-flex items-center gap-1 align-baseline mx-0.5 text-sm text-blue-400 hover:text-blue-300 transition-colors cursor-pointer underline decoration-blue-400/40 hover:decoration-blue-300/60"
                  title={result?.title || `Source ${citationNum}`}
                >
                  {result && (
                    <img
                      src={faviconUrl}
                      alt=""
                      className="inline-block w-3.5 h-3.5 rounded-sm"
                      onError={(e) => {
                        // Fallback if favicon fails to load
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <span className="font-medium">{children}</span>
                </button>
              );
            }

            // Regular link
            return (
              <a
                href={href}
                className="text-blue-400 underline hover:text-blue-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  // Only re-render if content, isUser, or searchResults change
  return (
    prevProps.content === nextProps.content &&
    prevProps.isUser === nextProps.isUser &&
    prevProps.searchResults === nextProps.searchResults &&
    prevProps.onCitationClick === nextProps.onCitationClick &&
    prevProps.onSourceClick === nextProps.onSourceClick
  );
});

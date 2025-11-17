'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, Copy, ChevronsDown } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const checkScrollable = () => {
      if (codeRef.current) {
        const element = codeRef.current.querySelector('pre');
        if (element) {
          const hasScroll = element.scrollHeight > element.clientHeight;
          setIsScrollable(hasScroll);
          setShowScrollIndicator(hasScroll && element.scrollTop === 0);
        }
      }
    };

    // Check initially and after a short delay to ensure content is rendered
    checkScrollable();
    const timer = setTimeout(checkScrollable, 100);

    return () => clearTimeout(timer);
  }, [code]);

  const handleScroll = (e: React.UIEvent<HTMLPreElement>) => {
    const element = e.currentTarget;
    const isAtTop = element.scrollTop === 0;
    setShowScrollIndicator(isAtTop && isScrollable);
  };

  return (
    <div className="group relative my-4" ref={codeRef}>
      {/* Language badge */}
      <div className="absolute left-3 top-3 font-mono text-xs text-gray-400 z-10">
        {language}
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="absolute right-3 top-3 z-10 rounded-md bg-gray-800 p-2 opacity-0 transition-opacity hover:bg-gray-700 group-hover:opacity-100"
        aria-label={copied ? "Copied!" : "Copy code"}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-400" />
        ) : (
          <Copy className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Scroll indicator - gradient fade at bottom */}
      {showScrollIndicator && (
        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-10 rounded-b-lg flex items-end justify-center pb-2"
             style={{
               background: 'linear-gradient(to top, rgba(28, 29, 33, 0.95) 0%, rgba(28, 29, 33, 0.8) 30%, transparent 100%)'
             }}>
          <div className="flex items-center gap-1 text-xs text-gray-400 animate-bounce">
            <ChevronsDown className="h-4 w-4" />
            <span className="font-medium">Scroll for more</span>
          </div>
        </div>
      )}

      {/* Code */}
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          background: '#1c1d21',
          border: '1px solid #2e2f37',
          borderRadius: '8px',
          padding: '16px',
          paddingTop: '40px', // Space for language badge
          margin: 0,
          fontSize: '13px',
          lineHeight: '1.6',
          maxHeight: '400px', // Maximum height before scrolling
          overflowY: 'auto', // Enable vertical scrolling
          overflowX: 'auto', // Enable horizontal scrolling for long lines
          maxWidth: '100%', // Prevent overflow beyond container
        }}
        codeTagProps={{
          style: {
            fontFamily: 'Fira Code, Courier New, monospace',
          },
        }}
        PreTag={({ children, ...props }: any) => (
          <pre {...props} onScroll={handleScroll}>
            {children}
          </pre>
        )}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

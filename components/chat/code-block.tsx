'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative my-4">
      {/* Language badge */}
      <div className="absolute left-3 top-3 font-mono text-xs text-gray-400">
        {language}
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="absolute right-3 top-3 rounded-md bg-gray-800 p-2 opacity-0 transition-opacity hover:bg-gray-700 group-hover:opacity-100"
        aria-label={copied ? "Copied!" : "Copy code"}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-400" />
        ) : (
          <Copy className="h-4 w-4 text-gray-400" />
        )}
      </button>

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
        }}
        codeTagProps={{
          style: {
            fontFamily: 'Fira Code, Courier New, monospace',
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

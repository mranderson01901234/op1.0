"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";

interface MessageRendererProps {
  content: string;
  isUser: boolean;
}

export function MessageRenderer({ content, isUser }: MessageRendererProps) {
  if (isUser) {
    return (
      <div className="max-w-[80%] rounded-2xl bg-gradient-card px-5 py-4 shadow-linear-sm">
        <div className="whitespace-pre-wrap break-words text-[15px] leading-[1.6] text-white">
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
          code({ node, inline, className, children, ...props }) {
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
            <p className="my-3 text-[15px] leading-[1.7] text-gray-400">
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
            <li className="relative pl-6 text-[15px] leading-[1.6] before:absolute before:left-2 before:font-bold before:text-[#6e6e70] before:content-['•']">
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
          // Links
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-blue-400 underline hover:text-blue-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

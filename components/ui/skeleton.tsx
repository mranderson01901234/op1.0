"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-surface-elevated",
        className
      )}
    />
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 border-l-2 border-elevated pl-4 py-2">
      <div className="flex gap-1">
        <div className="h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:-0.3s]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:-0.15s]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-text-muted" />
      </div>
      <span className="ml-2 text-sm text-text-muted">Thinking...</span>
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <div className="space-y-0.5 px-2 py-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex h-11 items-center rounded-lg px-3"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-[70%]" />
            <Skeleton className="h-2 w-[40%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FileTreeSkeleton() {
  return (
    <div className="space-y-1 px-2 py-3">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="flex h-9 items-center gap-2"
          style={{ paddingLeft: `${12 + (i % 3) * 16}px` }}
        >
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-3 flex-1" />
        </div>
      ))}
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="space-y-2 border-l-2 border-elevated pl-4 py-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-[90%]" />
      <Skeleton className="h-3 w-[95%]" />
      <Skeleton className="h-3 w-[85%]" />
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[#1c1d21]",
        className
      )}
    />
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="max-w-full space-y-3">
        <Skeleton className="h-4 w-[300px]" />
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[280px]" />
      </div>
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <div className="space-y-2 px-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-11 space-y-2 rounded-lg p-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2 w-16" />
        </div>
      ))}
    </div>
  );
}

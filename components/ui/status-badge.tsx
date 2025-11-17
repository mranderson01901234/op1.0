"use client";

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  connected: boolean;
  className?: string;
}

export function StatusBadge({ connected, className }: StatusBadgeProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            connected ? "bg-green-500" : "bg-text-muted"
          )}
        />
        {connected && (
          <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping opacity-75" />
        )}
      </div>
      <span className="text-sm text-text-secondary">
        {connected ? "Connected" : "Disconnected"}
      </span>
    </div>
  );
}

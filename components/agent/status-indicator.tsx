"use client";

import { useAgentStatus } from "@/hooks/use-agent-status";
import { cn } from "@/lib/utils";

interface AgentStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export function AgentStatusIndicator({
  className,
  showLabel = false
}: AgentStatusIndicatorProps) {
  const { isConnected, lastSeen, isLoading } = useAgentStatus();

  const getStatusColor = () => {
    if (isLoading) return "bg-gray-400";
    return isConnected ? "bg-green-500" : "bg-red-500";
  };

  const getStatusText = () => {
    if (isLoading) return "Checking...";
    if (isConnected) return "Connected";
    if (lastSeen) {
      const minutesAgo = Math.floor((Date.now() - lastSeen.getTime()) / 60000);
      if (minutesAgo < 1) return "Disconnected (just now)";
      if (minutesAgo < 60) return `Disconnected (${minutesAgo}m ago)`;
      const hoursAgo = Math.floor(minutesAgo / 60);
      return `Disconnected (${hoursAgo}h ago)`;
    }
    return "Disconnected";
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div
          className={cn(
            "h-2 w-2 rounded-full transition-colors duration-300",
            getStatusColor()
          )}
        />
        {isConnected && (
          <div
            className={cn(
              "absolute inset-0 h-2 w-2 rounded-full animate-ping",
              getStatusColor(),
              "opacity-75"
            )}
          />
        )}
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {getStatusText()}
        </span>
      )}
    </div>
  );
}

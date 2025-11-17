"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Conversation {
  id: string;
  title: string;
  timestamp: string;
}

interface ChatPanelProps {
  collapsed: boolean;
}

export function ChatPanel({ collapsed }: ChatPanelProps) {
  const [conversations] = useState<Conversation[]>([
    { id: "1", title: "Building UI components", timestamp: "2m ago" },
    { id: "2", title: "API integration discussion", timestamp: "1h ago" },
    { id: "3", title: "Database schema design", timestamp: "3h ago" },
    { id: "4", title: "Authentication setup", timestamp: "Yesterday" },
    { id: "5", title: "Code review session", timestamp: "2 days ago" },
  ]);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string>("1");

  if (collapsed) return null;

  return (
    <div className="flex-1 overflow-y-auto px-2 py-3">
      <div className="space-y-0.5">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={cn(
              "group relative flex h-11 cursor-pointer items-center justify-between rounded-lg px-3",
              "transition-all duration-150 ease-linear",
              activeId === conv.id
                ? "border-l-2 bg-gradient-active"
                : "hover:bg-gradient-hover",
              "relative"
            )}
            style={
              activeId === conv.id
                ? { borderLeftColor: "rgba(255, 255, 255, 0.9)" }
                : undefined
            }
            onMouseEnter={() => setHoveredId(conv.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => setActiveId(conv.id)}
          >
            <div className="flex-1 overflow-hidden pr-2">
              <div className="truncate text-sm font-medium text-text-primary">
                {conv.title}
              </div>
              <div className="text-[11px] text-text-timestamp">{conv.timestamp}</div>
            </div>
            {hoveredId === conv.id && (
              <button
                className="flex h-6 w-6 items-center justify-center rounded opacity-0 transition-opacity hover:bg-elevated group-hover:opacity-100"
                aria-label="Delete conversation"
              >
                <Trash2 className="h-3.5 w-3.5 text-text-muted" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

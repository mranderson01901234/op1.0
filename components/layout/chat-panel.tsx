"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { getConversations, deleteConversation } from "@/lib/storage";
import { formatMessageTime } from "@/lib/utils";
import { toast } from "sonner";
import type { Conversation } from "@/lib/types";

interface ChatPanelProps {
  collapsed: boolean;
}

export function ChatPanel({ collapsed }: ChatPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string>("");

  // Load conversations from storage
  useEffect(() => {
    const loadConversations = () => {
      const loadedConversations = getConversations();
      setConversations(loadedConversations);
      
      // Set active conversation to the first one if available
      if (loadedConversations.length > 0 && !activeId) {
        setActiveId(loadedConversations[0].id);
      }
    };

    loadConversations();

    // Listen for conversation updates (when new conversations are saved)
    const handleStorageChange = () => {
      loadConversations();
    };

    // Listen for custom events
    window.addEventListener('conversation-saved', handleStorageChange);
    window.addEventListener('conversation-deleted', handleStorageChange);
    
    // Also listen for storage events (in case storage is updated from another tab)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('conversation-saved', handleStorageChange);
      window.removeEventListener('conversation-deleted', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [activeId]);

  // Listen for current conversation ID changes from chat interface
  useEffect(() => {
    const handleConversationChange = (event: CustomEvent<string>) => {
      setActiveId(event.detail);
    };

    window.addEventListener('conversation-changed', handleConversationChange as EventListener);
    return () => {
      window.removeEventListener('conversation-changed', handleConversationChange as EventListener);
    };
  }, []);

  const handleDelete = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation(); // Prevent triggering conversation selection
    
    try {
      deleteConversation(conversationId);
      
      // Update local state and get remaining conversations
      setConversations(prev => {
        const remaining = prev.filter(c => c.id !== conversationId);
        
        // If deleted conversation was active, switch to first available or clear
        if (activeId === conversationId) {
          if (remaining.length > 0) {
            setActiveId(remaining[0].id);
            // Dispatch event to load the conversation
            window.dispatchEvent(new CustomEvent('load-conversation', { detail: remaining[0].id }));
          } else {
            setActiveId("");
            // Dispatch new chat event if no conversations left
            window.dispatchEvent(new CustomEvent('new-chat'));
          }
        }
        
        return remaining;
      });
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('conversation-deleted', { detail: conversationId }));
      
      toast.success("Conversation deleted");
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      toast.error("Failed to delete conversation");
    }
  };

  const handleConversationClick = (conversationId: string) => {
    setActiveId(conversationId);
    // Dispatch event to load the conversation in the chat interface
    window.dispatchEvent(new CustomEvent('load-conversation', { detail: conversationId }));
  };

  if (collapsed) return null;

  if (conversations.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-text-muted">No conversations yet</p>
        </div>
      </div>
    );
  }

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
            onClick={() => handleConversationClick(conv.id)}
          >
            <div className="flex-1 overflow-hidden pr-2">
              <div className="truncate text-sm font-medium text-text-primary">
                {conv.title}
              </div>
              <div className="text-[11px] text-text-timestamp">
                {formatMessageTime(conv.updatedAt)}
              </div>
            </div>
            {hoveredId === conv.id && (
              <button
                onClick={(e) => handleDelete(e, conv.id)}
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

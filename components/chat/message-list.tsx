"use client";

import { useRef, useEffect } from "react";
import { Message } from "./message";
import { WelcomeScreen } from "./welcome-screen";
import { cn } from "@/lib/utils";

interface MessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface MessageListProps {
  messages: MessageData[];
  onPromptSelect?: (prompt: string) => void;
  className?: string;
}

export function MessageList({ messages, onPromptSelect, className }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className={cn("flex flex-1 flex-col items-center overflow-y-auto py-8", className)}
    >
      {messages.length === 0 ? (
        <WelcomeScreen onPromptSelect={onPromptSelect || (() => {})} />
      ) : (
        <div className="w-full max-w-[720px] space-y-2 px-8">
          {messages.map((message) => (
            <Message key={message.id} role={message.role} content={message.content} />
          ))}
        </div>
      )}
    </div>
  );
}

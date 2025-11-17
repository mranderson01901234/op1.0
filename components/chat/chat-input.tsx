"use client";

import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { Send, Paperclip, Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  className?: string;
}

export function ChatInput({ onSend, className }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim()) {
      const sendStartTime = performance.now();
      console.log(`[PERF] ===== USER ACTION =====`);
      console.log(`[PERF] ChatInput.handleSend called at ${sendStartTime.toFixed(2)}ms`);
      onSend(message.trim());
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "48px";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "48px";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 160) + "px";
    }
  }, [message]);

  return (
    <div className={cn("relative flex w-full justify-center bg-background px-0 pb-6 pt-4", className)}>
      <div className="w-full max-w-[780px] px-8">
        {/* Slim Rugged Input Container */}
        <div
          className={cn(
            "relative flex items-center gap-3 rounded-lg px-4 py-3",
            "bg-surface shadow-linear-sm transition-all duration-200",
            isFocused && "shadow-linear-md"
          )}
          style={{
            border: isFocused
              ? "1px solid rgba(255, 255, 255, 0.14)"
              : "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {/* Left Actions */}
          <div className="flex items-center gap-1.5">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-md transition-all duration-150 hover:bg-elevated"
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4 text-text-secondary" />
            </button>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-md transition-all duration-150 hover:bg-elevated"
              aria-label="Add image"
            >
              <Image className="h-4 w-4 text-text-secondary" />
            </button>
          </div>

          {/* Vertical Divider */}
          <div
            className="h-8 w-px"
            style={{ background: "rgba(255, 255, 255, 0.06)" }}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask anything..."
            className={cn(
              "flex-1 resize-none bg-transparent",
              "text-[15px] leading-[1.5] text-white placeholder:text-gray-600",
              "focus:outline-none",
              "scrollbar-thin"
            )}
            style={{
              minHeight: "24px",
              maxHeight: "120px",
              overflow: "auto",
            }}
            rows={1}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className={cn(
              "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-150",
              message.trim()
                ? "bg-white text-background hover:bg-gray-200 active:scale-95"
                : "cursor-not-allowed bg-elevated text-text-muted opacity-30"
            )}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

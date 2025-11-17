"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MessageProps {
  role: "user" | "assistant";
  content: string;
  className?: string;
}

export function Message({ role, content, className }: MessageProps) {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start", className)}
    >
      <div
        className={cn(
          isUser
            ? "max-w-[80%] bg-gradient-card px-5 py-4 shadow-linear-sm"
            : "max-w-full pl-4 py-2"
        )}
        style={
          isUser
            ? { borderRadius: "16px 16px 4px 16px" }
            : { borderLeft: "2px solid rgba(255, 255, 255, 0.08)" }
        }
      >
        <div
          className={cn(
            "whitespace-pre-wrap break-words text-[16px] leading-[1.6]",
            isUser ? "text-white" : "text-gray-400"
          )}
        >
          {content}
        </div>
      </div>
    </motion.div>
  );
}

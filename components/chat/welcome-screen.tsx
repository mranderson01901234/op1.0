"use client";

import { motion } from "framer-motion";
import { Sparkles, Code, FileText, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomeScreenProps {
  onPromptSelect: (prompt: string) => void;
}

const suggestedPrompts = [
  {
    icon: Code,
    title: "Build a component",
    prompt: "Help me build a responsive navigation component with React and Tailwind CSS",
  },
  {
    icon: FileText,
    title: "Review code",
    prompt: "Can you review my code and suggest improvements for performance and readability?",
  },
  {
    icon: Lightbulb,
    title: "Debug an issue",
    prompt: "I'm getting a TypeScript error. Can you help me understand what's wrong?",
  },
  {
    icon: Sparkles,
    title: "Learn something new",
    prompt: "Explain how React Server Components work and when to use them",
  },
];

export function WelcomeScreen({ onPromptSelect }: WelcomeScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex h-full min-h-[500px] flex-col items-center justify-center px-8 py-12"
    >
      {/* Welcome Message */}
      <div className="mb-10 text-center">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-3 text-3xl font-semibold tracking-tight text-white"
        >
          Welcome to OperaStudio
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-base text-gray-400"
        >
          Ask me anything or try one of these suggestions
        </motion.p>
      </div>

      {/* Suggested Prompts - Horizontal Row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="flex w-full max-w-5xl gap-3"
      >
        {suggestedPrompts.map((item, index) => (
          <motion.button
            key={item.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
            onClick={() => onPromptSelect(item.prompt)}
            className={cn(
              "group relative flex flex-1 flex-col items-start gap-2 rounded-lg bg-gray-925 p-3 shadow-linear-sm",
              "text-left transition-all duration-200",
              "hover:bg-gray-900",
              "focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-gray-950"
            )}
            style={{ border: "1px solid rgba(255, 255, 255, 0.06)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
            }}
            aria-label={`Suggested prompt: ${item.title}`}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 transition-colors group-hover:bg-white/10">
                <item.icon className="h-3.5 w-3.5 text-gray-500" />
              </div>
              <h3 className="text-xs font-medium text-white">
                {item.title}
              </h3>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Get Started Cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="mt-6 text-center"
      >
        <p className="text-xs text-gray-600">
          Type your question below to get started
        </p>
      </motion.div>
    </motion.div>
  );
}

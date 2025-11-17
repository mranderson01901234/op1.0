"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentStatus {
  connected: boolean;
  serverId?: string;
  userId?: string;
}

interface AgentStatusProps {
  collapsed?: boolean;
  className?: string;
}

export function AgentStatus({ collapsed = false, className }: AgentStatusProps) {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check agent status
  const checkStatus = async () => {
    try {
      const response = await fetch("/api/agent/status");

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setError(null);
      } else if (response.status === 401) {
        // User not authenticated - don't show anything
        setStatus(null);
        setError(null);
      } else {
        setError("Failed to check status");
      }
    } catch (err) {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  // Poll for status every 10 seconds
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Don't show anything if not authenticated or loading
  if (loading || (!status && !error)) {
    return null;
  }

  // Error state - minimal design
  if (error) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {!collapsed ? (
          <div className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2.5 transition-all duration-150">
            <div className="h-2 w-2 rounded-full bg-gray-400" />
            <span className="text-xs text-gray-400">
              Error
            </span>
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-gray-400" />
          </div>
        )}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {status?.connected ? (
        <motion.div
          key="connected"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn("flex items-center gap-2", className)}
        >
          {!collapsed ? (
            <div className="flex flex-1 items-center justify-between gap-2 rounded-lg px-3 py-2.5 transition-all duration-150 hover:bg-gradient-hover">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative">
                  <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                  {status.connected && (
                    <div className="absolute inset-0 h-2 w-2 rounded-full bg-cyan-500 animate-pulse opacity-75 shadow-[0_0_8px_rgba(6,182,212,1)]" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-gray-400 truncate">
                    {status.serverId || "Connected"}
                  </span>
                </div>
              </div>
              <button
                aria-label="Open settings"
                className="flex h-8 w-8 items-center justify-center rounded-lg opacity-40 transition-all duration-150 hover:bg-white/5 hover:opacity-60"
              >
                <Settings className="h-4 w-4 text-gray-400" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center">
                <div className="relative">
                  <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                  {status.connected && (
                    <div className="absolute inset-0 h-2 w-2 rounded-full bg-cyan-500 animate-pulse opacity-75 shadow-[0_0_8px_rgba(6,182,212,1)]" />
                  )}
                </div>
              </div>
              <button
                aria-label="Open settings"
                className="flex h-8 w-8 items-center justify-center rounded-lg opacity-40 transition-all duration-150 hover:bg-white/5 hover:opacity-60"
              >
                <Settings className="h-4 w-4 text-gray-400" aria-hidden="true" />
              </button>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          key="disconnected"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn("flex items-center gap-2", className)}
        >
          {!collapsed ? (
            <div className="flex flex-1 items-center justify-between gap-2 rounded-lg px-3 py-2.5 transition-all duration-150 hover:bg-gradient-hover">
              <div className="flex flex-1 items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gray-500" />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-gray-500">
                    Offline
                  </span>
                  <button
                    onClick={() => window.location.href = "/setup"}
                    className="text-xs text-gray-400 hover:text-gray-300 text-left transition-colors"
                  >
                    Setup →
                  </button>
                </div>
              </div>
              <button
                aria-label="Open settings"
                className="flex h-8 w-8 items-center justify-center rounded-lg opacity-40 transition-all duration-150 hover:bg-white/5 hover:opacity-60"
              >
                <Settings className="h-4 w-4 text-gray-400" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-gray-500" />
              </div>
              <button
                aria-label="Open settings"
                className="flex h-8 w-8 items-center justify-center rounded-lg opacity-40 transition-all duration-150 hover:bg-white/5 hover:opacity-60"
              >
                <Settings className="h-4 w-4 text-gray-400" aria-hidden="true" />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

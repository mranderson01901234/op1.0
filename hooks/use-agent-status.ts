"use client";

import { useState, useEffect, useCallback } from "react";

interface AgentStatus {
  connected: boolean;
  lastSeen?: string;
}

interface UseAgentStatusReturn {
  isConnected: boolean;
  lastSeen: Date | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const POLL_INTERVAL = 10000; // 10 seconds

export function useAgentStatus(): UseAgentStatusReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/agent/status");

      if (!response.ok) {
        setIsConnected(false);
        return;
      }

      const data: AgentStatus = await response.json();
      setIsConnected(data.connected);

      if (data.lastSeen) {
        setLastSeen(new Date(data.lastSeen));
      }
    } catch (error) {
      console.error("Failed to check agent status:", error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial check
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Polling
  useEffect(() => {
    const interval = setInterval(checkStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return {
    isConnected,
    lastSeen,
    isLoading,
    refresh: checkStatus,
  };
}

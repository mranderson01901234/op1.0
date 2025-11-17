"use client";

import { useEffect } from 'react';

interface ShortcutHandlers {
  onNewChat?: () => void;
  onSend?: () => void;
}

/**
 * Custom hook for keyboard shortcuts
 * Cmd+K or Ctrl+K: New chat
 * Enter (when not in textarea): Send message
 */
export function useKeyboardShortcuts({ onNewChat, onSend }: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K: New chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onNewChat?.();
        return;
      }

      // Enter (not in textarea or input): Send
      if (e.key === 'Enter' && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'TEXTAREA' && target.tagName !== 'INPUT') {
          e.preventDefault();
          onSend?.();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewChat, onSend]);
}

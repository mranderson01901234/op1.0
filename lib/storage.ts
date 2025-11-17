import type { Conversation, Message } from './types';

const STORAGE_KEY_PREFIX = 'operastudio_conversations';
const MAX_CONVERSATIONS = 50;

/**
 * Get storage key scoped to user ID
 * If no user ID provided, uses 'anonymous' for unauthenticated users
 */
function getStorageKey(userId?: string | null): string {
  const userIdKey = userId || 'anonymous';
  return `${STORAGE_KEY_PREFIX}_${userIdKey}`;
}

/**
 * Get all conversations from localStorage for a specific user
 */
export function getConversations(userId?: string | null): Conversation[] {
  if (typeof window === 'undefined') return [];

  try {
    const storageKey = getStorageKey(userId);
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];

    const conversations = JSON.parse(stored);
    // Convert date strings back to Date objects
    return conversations.map((conv: any) => ({
      ...conv,
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
      messages: conv.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
    }));
  } catch (error) {
    console.error('Failed to load conversations:', error);
    return [];
  }
}

/**
 * Save conversation to localStorage for a specific user
 * Uses requestIdleCallback for non-blocking saves when available
 */
export function saveConversation(conversation: Conversation, userId?: string | null): void {
  if (typeof window === 'undefined') return;

  const performSave = () => {
    try {
      const storageKey = getStorageKey(userId);
      const conversations = getConversations(userId);
      const existingIndex = conversations.findIndex(c => c.id === conversation.id);

      if (existingIndex >= 0) {
        conversations[existingIndex] = conversation;
      } else {
        conversations.unshift(conversation);
      }

      // Keep only latest MAX_CONVERSATIONS
      const trimmed = conversations.slice(0, MAX_CONVERSATIONS);
      localStorage.setItem(storageKey, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  };

  // Use requestIdleCallback for non-blocking saves, fallback to setTimeout
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(performSave, { timeout: 2000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(performSave, 0);
  }
}

/**
 * Delete conversation from localStorage for a specific user
 * Uses requestIdleCallback for non-blocking deletes when available
 */
export function deleteConversation(id: string, userId?: string | null): void {
  if (typeof window === 'undefined') return;

  const performDelete = () => {
    try {
      const storageKey = getStorageKey(userId);
      const conversations = getConversations(userId);
      const filtered = conversations.filter(c => c.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  // Use requestIdleCallback for non-blocking deletes, fallback to setTimeout
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(performDelete, { timeout: 2000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(performDelete, 0);
  }
}

/**
 * Get single conversation by ID for a specific user
 */
export function getConversation(id: string, userId?: string | null): Conversation | null {
  const conversations = getConversations(userId);
  return conversations.find(c => c.id === id) || null;
}

/**
 * Clear all conversations for a specific user
 */
export function clearAllConversations(userId?: string | null): void {
  if (typeof window === 'undefined') return;
  const storageKey = getStorageKey(userId);
  localStorage.removeItem(storageKey);
}

/**
 * Clear all conversations for all users (complete cleanup)
 * Use this when signing out to ensure no data persists
 */
export function clearAllUserData(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Remove all conversation storage keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Failed to clear all user data:', error);
  }
}

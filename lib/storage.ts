import type { Conversation, Message } from './types';

const STORAGE_KEY = 'operastudio_conversations';
const MAX_CONVERSATIONS = 50;

/**
 * Get all conversations from localStorage
 */
export function getConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
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
 * Save conversation to localStorage
 */
export function saveConversation(conversation: Conversation): void {
  if (typeof window === 'undefined') return;

  try {
    const conversations = getConversations();
    const existingIndex = conversations.findIndex(c => c.id === conversation.id);

    if (existingIndex >= 0) {
      conversations[existingIndex] = conversation;
    } else {
      conversations.unshift(conversation);
    }

    // Keep only latest MAX_CONVERSATIONS
    const trimmed = conversations.slice(0, MAX_CONVERSATIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save conversation:', error);
  }
}

/**
 * Delete conversation from localStorage
 */
export function deleteConversation(id: string): void {
  if (typeof window === 'undefined') return;

  try {
    const conversations = getConversations();
    const filtered = conversations.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete conversation:', error);
  }
}

/**
 * Get single conversation by ID
 */
export function getConversation(id: string): Conversation | null {
  const conversations = getConversations();
  return conversations.find(c => c.id === id) || null;
}

/**
 * Clear all conversations
 */
export function clearAllConversations(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

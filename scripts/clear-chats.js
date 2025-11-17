/**
 * Utility script to clear all chat conversations from localStorage
 * 
 * This script now clears all user-scoped conversation data (works with the new storage system)
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Or run: node scripts/clear-chats.js (if running in Node.js environment)
 */

const STORAGE_KEY_PREFIX = 'operastudio_conversations';

function clearAllChats() {
  if (typeof window === 'undefined') {
    console.log('This script must be run in a browser environment');
    return;
  }

  try {
    // Count conversations before clearing
    let totalConversations = 0;
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const conversations = JSON.parse(data);
            totalConversations += Array.isArray(conversations) ? conversations.length : 0;
          }
        } catch (e) {
          // Ignore parsing errors
        }
        keysToRemove.push(key);
      }
    }
    
    // Remove all conversation storage keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`✅ Cleared: ${key}`);
    });
    
    console.log(`✅ Cleared ${totalConversations} conversation(s) from localStorage`);
    console.log(`Removed ${keysToRemove.length} storage key(s)`);
    
    // Also clear any other related storage keys that might exist
    const otherKeysToCheck = [
      'operastudio_current_conversation',
      'operastudio_chat_state'
    ];
    
    otherKeysToCheck.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`✅ Also cleared: ${key}`);
      }
    });
    
    console.log('\n🔄 Please refresh the page to see the changes.');
    
  } catch (error) {
    console.error('❌ Error clearing chats:', error);
  }
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  clearAllChats();
} else {
  // Export for Node.js usage
  module.exports = { clearAllChats };
}


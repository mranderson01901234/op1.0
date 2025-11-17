/**
 * Browser Console Script - Clear All Chats
 * 
 * Copy and paste this entire script into your browser console (F12)
 * to clear all chat conversations.
 */

(function() {
  const STORAGE_KEY = 'operastudio_conversations';
  
  try {
    // Get count before clearing
    const stored = localStorage.getItem(STORAGE_KEY);
    const beforeCount = stored ? JSON.parse(stored).length : 0;
    
    // Clear the main storage key
    localStorage.removeItem(STORAGE_KEY);
    
    // Clear any other related keys
    const relatedKeys = [
      'operastudio_current_conversation',
      'operastudio_chat_state',
      'operastudio_last_conversation_id'
    ];
    
    let clearedCount = 0;
    relatedKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        clearedCount++;
      }
    });
    
    console.log(`✅ Successfully cleared ${beforeCount} conversation(s)`);
    if (clearedCount > 0) {
      console.log(`✅ Also cleared ${clearedCount} related storage key(s)`);
    }
    console.log('\n🔄 Refresh the page to see the changes.');
    
    // Return success
    return { success: true, cleared: beforeCount };
  } catch (error) {
    console.error('❌ Error clearing chats:', error);
    return { success: false, error: error.message };
  }
})();


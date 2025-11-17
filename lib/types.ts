export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  searchResults?: any[]; // Store search results with assistant messages
  isSearchQuery?: boolean; // Track if this message was a search query (for user messages)
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StreamChunk {
  text: string;
  done?: boolean;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

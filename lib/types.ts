export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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

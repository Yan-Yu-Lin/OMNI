// Type definitions for database records

export type ConversationStatus = 'idle' | 'streaming' | 'error';

export interface ConversationRecord {
  id: string;
  title: string;
  model: string | null;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string; // JSON string of UIMessage parts
  created_at: string;
}

export interface SettingRecord {
  key: string;
  value: string; // JSON string
  updated_at: string;
}

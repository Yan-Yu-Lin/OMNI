// Type definitions for database records

export type ConversationStatus = 'idle' | 'streaming' | 'error';

export interface ConversationRecord {
  id: string;
  title: string;
  model: string | null;
  status: ConversationStatus;
  pinned: number; // 0 or 1 (SQLite boolean)
  active_leaf_id: string | null; // Points to the current active branch's leaf message
  created_at: string;
  updated_at: string;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string; // JSON string of UIMessage parts
  parent_id: string | null; // Points to parent message for branching support
  created_at: string;
  updated_at: string;
}

export interface SettingRecord {
  key: string;
  value: string; // JSON string
  updated_at: string;
}

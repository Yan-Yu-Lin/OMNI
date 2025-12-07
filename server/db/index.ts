import Database from 'better-sqlite3';
import { join } from 'path';

// Database file location
const dbPath = join(process.cwd(), 'data', 'chat.db');

// Create database instance
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    model TEXT,
    status TEXT NOT NULL DEFAULT 'idle',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
`);

// Migration: Add status column to existing conversations table if it doesn't exist
try {
  const tableInfo = db.prepare("PRAGMA table_info(conversations)").all() as { name: string }[];
  const hasStatusColumn = tableInfo.some(col => col.name === 'status');
  if (!hasStatusColumn) {
    db.exec("ALTER TABLE conversations ADD COLUMN status TEXT NOT NULL DEFAULT 'idle'");
    console.log('[DB Migration] Added status column to conversations table');
  }
} catch (e) {
  console.error('[DB Migration] Error checking/adding status column:', e);
}

export default db;

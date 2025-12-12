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

// Migration: Add updated_at column to messages table if it doesn't exist
try {
  const messagesInfo = db.prepare("PRAGMA table_info(messages)").all() as { name: string }[];
  const hasUpdatedAt = messagesInfo.some(col => col.name === 'updated_at');
  if (!hasUpdatedAt) {
    // SQLite doesn't allow CURRENT_TIMESTAMP as default in ALTER TABLE, so use NULL
    db.exec("ALTER TABLE messages ADD COLUMN updated_at DATETIME");
    console.log('[DB Migration] Added updated_at column to messages table');
  }
} catch (e) {
  console.error('[DB Migration] Error checking/adding updated_at column to messages:', e);
}

// Migration: Create cache table if it doesn't exist
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache(expires_at);
  `);
  console.log('[DB] Cache table ready');
} catch (e) {
  // Table might already exist, that's fine
}

// Migration: Add provider_preferences column to conversations table
try {
  const tableInfo = db.prepare('PRAGMA table_info(conversations)').all() as { name: string }[];
  const hasProviderPreferences = tableInfo.some(col => col.name === 'provider_preferences');
  if (!hasProviderPreferences) {
    db.exec('ALTER TABLE conversations ADD COLUMN provider_preferences TEXT');
    console.log('[DB Migration] Added provider_preferences column to conversations table');
  }
} catch (e) {
  console.error('[DB Migration] Error checking/adding provider_preferences column:', e);
}

// Migration: Add pinned column to conversations table
try {
  const tableInfo = db.prepare('PRAGMA table_info(conversations)').all() as { name: string }[];
  const hasPinned = tableInfo.some(col => col.name === 'pinned');
  if (!hasPinned) {
    db.exec('ALTER TABLE conversations ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0');
    console.log('[DB Migration] Added pinned column to conversations table');
  }
} catch (e) {
  console.error('[DB Migration] Error checking/adding pinned column:', e);
}

export default db;

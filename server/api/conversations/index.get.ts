import db from '../../db';
import type { ConversationRecord } from '../../db/schema';

export default defineEventHandler(async () => {
  const conversations = db.prepare(`
    SELECT id, title, model, status, pinned, created_at, updated_at
    FROM conversations
    ORDER BY updated_at DESC
  `).all() as ConversationRecord[];

  return conversations.map(conv => ({
    id: conv.id,
    title: conv.title,
    model: conv.model,
    status: conv.status,
    pinned: conv.pinned === 1,
    createdAt: conv.created_at,
    updatedAt: conv.updated_at,
  }));
});

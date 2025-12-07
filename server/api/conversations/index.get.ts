import db from '../../db';
import type { ConversationRecord } from '../../db/schema';

export default defineEventHandler(async () => {
  const conversations = db.prepare(`
    SELECT id, title, model, created_at, updated_at
    FROM conversations
    ORDER BY updated_at DESC
  `).all() as ConversationRecord[];

  return conversations.map(conv => ({
    id: conv.id,
    title: conv.title,
    model: conv.model,
    createdAt: conv.created_at,
    updatedAt: conv.updated_at,
  }));
});

import { nanoid } from 'nanoid';
import db from '../../db';

interface CreateConversationBody {
  title?: string;
  model?: string;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateConversationBody>(event);

  const id = nanoid();
  const title = body.title || 'New Conversation';
  const model = body.model || null;

  db.prepare(`
    INSERT INTO conversations (id, title, model)
    VALUES (?, ?, ?)
  `).run(id, title, model);

  const conversation = db.prepare(`
    SELECT id, title, model, created_at, updated_at
    FROM conversations
    WHERE id = ?
  `).get(id) as {
    id: string;
    title: string;
    model: string | null;
    created_at: string;
    updated_at: string;
  };

  return {
    id: conversation.id,
    title: conversation.title,
    model: conversation.model,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
  };
});

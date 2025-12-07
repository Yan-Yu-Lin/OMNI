import { nanoid } from 'nanoid';
import db from '../../../db';
import type { UIMessage } from 'ai';

interface SaveMessagesBody {
  messages: UIMessage[];
}

export default defineEventHandler(async (event) => {
  const conversationId = getRouterParam(event, 'id');
  const body = await readBody<SaveMessagesBody>(event);

  if (!conversationId) {
    throw createError({
      statusCode: 400,
      message: 'Conversation ID is required',
    });
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    throw createError({
      statusCode: 400,
      message: 'Messages array is required',
    });
  }

  // Delete existing messages for this conversation
  db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(conversationId);

  // Insert new messages
  const insert = db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content)
    VALUES (?, ?, ?, ?)
  `);

  const insertMany = db.transaction((messages: UIMessage[]) => {
    for (const msg of messages) {
      const { id, role, ...rest } = msg;
      insert.run(
        id || nanoid(),
        conversationId,
        role,
        JSON.stringify(rest)
      );
    }
  });

  insertMany(body.messages);

  // Update conversation timestamp
  db.prepare(`
    UPDATE conversations
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(conversationId);

  return { success: true };
});

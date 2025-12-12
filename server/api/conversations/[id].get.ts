import db from '../../db';
import type { ConversationRecord, MessageRecord } from '../../db/schema';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Conversation ID is required',
    });
  }

  const conversation = db.prepare(`
    SELECT id, title, model, provider_preferences, status, created_at, updated_at
    FROM conversations
    WHERE id = ?
  `).get(id) as (ConversationRecord & { provider_preferences?: string }) | undefined;

  if (!conversation) {
    throw createError({
      statusCode: 404,
      message: 'Conversation not found',
    });
  }

  const messages = db.prepare(`
    SELECT id, conversation_id, role, content, created_at
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `).all(id) as MessageRecord[];

  return {
    id: conversation.id,
    title: conversation.title,
    model: conversation.model,
    providerPreferences: conversation.provider_preferences
      ? JSON.parse(conversation.provider_preferences)
      : undefined,
    status: conversation.status,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
    messages: messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      ...JSON.parse(msg.content), // content stores the full UIMessage structure (parts, etc.)
    })),
  };
});

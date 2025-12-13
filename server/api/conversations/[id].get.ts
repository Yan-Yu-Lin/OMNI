import db from '../../db';
import type { ConversationRecord, MessageRecord } from '../../db/schema';
import { getActivePath, getAllMessages } from '../../utils/chat-persistence';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Conversation ID is required',
    });
  }

  const conversation = db.prepare(`
    SELECT id, title, model, provider_preferences, status, pinned, active_leaf_id, created_at, updated_at
    FROM conversations
    WHERE id = ?
  `).get(id) as (ConversationRecord & { provider_preferences?: string }) | undefined;

  if (!conversation) {
    throw createError({
      statusCode: 404,
      message: 'Conversation not found',
    });
  }

  // Get all messages for tree building (includes parent_id)
  const allMessages = getAllMessages(id);

  // Get the active path for initial display
  const activePath = getActivePath(id);

  return {
    id: conversation.id,
    title: conversation.title,
    model: conversation.model,
    providerPreferences: conversation.provider_preferences
      ? JSON.parse(conversation.provider_preferences)
      : undefined,
    status: conversation.status,
    pinned: conversation.pinned === 1,
    activeLeafId: conversation.active_leaf_id,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
    // All messages with parentId for tree building on client
    messages: allMessages.map(msg => ({
      id: msg.id,
      role: msg.role,
      parentId: msg.parent_id,
      ...JSON.parse(msg.content), // content stores the full UIMessage structure (parts, etc.)
    })),
    // Active path messages for initial display (in order from root to leaf)
    activePath: activePath.map(msg => ({
      id: msg.id,
      role: msg.role,
      parentId: msg.parent_id,
      ...JSON.parse(msg.content),
    })),
  };
});

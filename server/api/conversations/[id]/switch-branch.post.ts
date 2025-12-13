import db from '../../../db';
import { updateActiveLeaf } from '../../../utils/chat-persistence';

export default defineEventHandler(async (event) => {
  const conversationId = getRouterParam(event, 'id');
  const { messageId } = await readBody<{ messageId: string }>(event);

  // Validate inputs
  if (!conversationId || !messageId) {
    throw createError({
      statusCode: 400,
      message: 'Conversation ID and message ID are required',
    });
  }

  // Verify message exists and belongs to this conversation
  const message = db
    .prepare(
      `
      SELECT id, conversation_id FROM messages WHERE id = ?
    `
    )
    .get(messageId) as { id: string; conversation_id: string } | undefined;

  if (!message || message.conversation_id !== conversationId) {
    throw createError({
      statusCode: 404,
      message: 'Message not found in this conversation',
    });
  }

  // Walk down from this message to find the leaf (last message in this branch)
  // For now, we just use the clicked message as the new leaf
  // (In a more complex implementation, we'd find the deepest descendant)
  let leafId = messageId;

  // Find children and walk to the first child's leaf
  let hasChildren = true;
  while (hasChildren) {
    const child = db
      .prepare(
        `
        SELECT id FROM messages
        WHERE parent_id = ?
        ORDER BY created_at ASC
        LIMIT 1
      `
      )
      .get(leafId) as { id: string } | undefined;

    if (child) {
      leafId = child.id;
    } else {
      hasChildren = false;
    }
  }

  // Update the active leaf
  updateActiveLeaf(conversationId, leafId);

  return { success: true, activeLeafId: leafId };
});

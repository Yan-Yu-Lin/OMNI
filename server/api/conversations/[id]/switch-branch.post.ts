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
  // Depth-first walk to find the deepest descendant in this branch
  let leafId = messageId;
  const stack: string[] = [messageId];

  while (stack.length > 0) {
    const currentId = stack.pop() as string;
    const children = db
      .prepare(
        `
        SELECT id FROM messages
        WHERE parent_id = ?
        ORDER BY created_at ASC
      `
      )
      .all(currentId) as { id: string }[];

    if (children.length === 0) {
      // No children, this is a leaf candidate
      leafId = currentId;
    } else {
      // Explore children to find deepest descendant
      for (const child of children) {
        stack.push(child.id);
      }
    }
  }

  // Update the active leaf
  updateActiveLeaf(conversationId, leafId);

  return { success: true, activeLeafId: leafId };
});

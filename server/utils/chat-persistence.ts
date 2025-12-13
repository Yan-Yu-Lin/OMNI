import { nanoid } from 'nanoid';
import type { UIMessage } from 'ai';
import db from '../db';
import type { ConversationStatus, MessageRecord } from '../db/schema';

// Type for assistant content part from model messages
interface AssistantContentPart {
  type: string;
  text?: string;
  toolName?: string;
  toolCallId?: string;
  args?: unknown;
}

// Type for tool result part
interface ToolResultPart {
  type: 'tool-result';
  toolCallId: string;
  result: unknown;
}

// Type for model messages from response.messages
interface ResponseMessage {
  id?: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string | AssistantContentPart[] | ToolResultPart[];
}

/**
 * Save a user message to the database
 * @param parentId - Optional parent message ID for branching support
 */
export function saveUserMessage(
  conversationId: string,
  message: UIMessage,
  parentId?: string
) {
  const { id, role, ...rest } = message;

  const insert = db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, parent_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  insert.run(
    id || nanoid(),
    conversationId,
    role,
    JSON.stringify(rest),
    parentId ?? null
  );

  // Update conversation timestamp
  db.prepare(`
    UPDATE conversations
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(conversationId);
}

/**
 * Convert model messages to UIMessages and save them to the database
 * This is called from onStepFinish and onFinish callbacks
 * Consolidates ALL assistant message parts into a single message to avoid splitting
 * @param parentId - Optional parent message ID for branching support
 */
export function saveAssistantMessages(
  conversationId: string,
  modelMessages: ResponseMessage[],
  parentId?: string
) {
  // Filter for only assistant messages
  const assistantMessages = modelMessages.filter((m) => m.role === 'assistant');

  if (assistantMessages.length === 0) return;

  // Consolidate ALL parts from ALL assistant messages into one
  const allParts: unknown[] = [];

  for (const msg of assistantMessages) {
    // Handle content - can be string or array
    const contentArray = typeof msg.content === 'string'
      ? [{ type: 'text', text: msg.content }]
      : msg.content;

    for (const part of contentArray as AssistantContentPart[]) {
      if (part.type === 'text') {
        allParts.push({ type: 'text', text: part.text });
      } else if (part.type === 'tool-call') {
        allParts.push({
          type: `tool-${part.toolName}`,
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          state: 'input-available',
          input: part.args,
        });
      } else if (part.type === 'reasoning') {
        allParts.push({ type: 'reasoning', text: part.text });
      }
    }
  }

  // Use first assistant message's ID for the consolidated message
  const messageId = assistantMessages[0].id || nanoid();
  const content = JSON.stringify({ parts: allParts });

  // UPSERT the single consolidated message
  const upsert = db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, parent_id)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      content = excluded.content,
      updated_at = CURRENT_TIMESTAMP
  `);
  upsert.run(messageId, conversationId, 'assistant', content, parentId ?? null);

  // NOTE: Removed DELETE statement that was destroying assistant sibling branches
  // The DELETE was cleaning up "duplicate" assistant messages, but with branching
  // support we need to preserve all assistant messages (siblings in different branches)

  // Update conversation timestamp
  db.prepare(`
    UPDATE conversations
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(conversationId);
}

/**
 * Save tool results to the database
 * This updates existing tool call parts with their outputs
 */
export function saveToolResults(
  conversationId: string,
  modelMessages: ResponseMessage[]
) {
  // Find tool messages (which contain tool results)
  const toolMessages = modelMessages.filter((m) => m.role === 'tool');

  if (toolMessages.length === 0) return;

  // For each tool result, we need to find the corresponding assistant message
  // and update the tool part with the result
  for (const toolMsg of toolMessages) {
    const contentArray = toolMsg.content as ToolResultPart[];

    for (const part of contentArray) {
      if (part.type === 'tool-result') {
        // Find the assistant message that has this tool call
        const assistantMsgs = db
          .prepare(
            `
          SELECT id, content
          FROM messages
          WHERE conversation_id = ? AND role = 'assistant'
          ORDER BY created_at DESC
        `
          )
          .all(conversationId) as { id: string; content: string }[];

        for (const msg of assistantMsgs) {
          try {
            const contentData = JSON.parse(msg.content);
            let updated = false;

            if (contentData.parts) {
              for (const msgPart of contentData.parts) {
                if (
                  msgPart.toolCallId === part.toolCallId &&
                  msgPart.state !== 'output-available'
                ) {
                  msgPart.state = 'output-available';
                  msgPart.output = part.result;
                  updated = true;
                }
              }
            }

            if (updated) {
              db.prepare(`
                UPDATE messages
                SET content = ?
                WHERE id = ?
              `).run(JSON.stringify(contentData), msg.id);
              break;
            }
          } catch {
            // Skip messages with invalid JSON
          }
        }
      }
    }
  }
}

/**
 * Set the conversation status
 */
export function setConversationStatus(
  conversationId: string,
  status: ConversationStatus
) {
  db.prepare(`
    UPDATE conversations
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, conversationId);
}

/**
 * Auto-generate conversation title from the first user message
 */
export function autoGenerateTitle(conversationId: string, userMessage: UIMessage) {
  // Check if title is still default
  const conv = db.prepare(`
    SELECT title FROM conversations WHERE id = ?
  `).get(conversationId) as { title: string } | undefined;

  if (conv && conv.title === 'New Conversation') {
    // Extract text from the first part of the message
    const firstPart = userMessage.parts?.[0];
    if (firstPart && firstPart.type === 'text' && 'text' in firstPart) {
      const text = firstPart.text;
      const title = text.slice(0, 50) + (text.length > 50 ? '...' : '');

      db.prepare(`
        UPDATE conversations
        SET title = ?
        WHERE id = ?
      `).run(title, conversationId);
    }
  }
}

/**
 * Update conversation's active leaf pointer
 * Called after saving messages to track the current branch endpoint
 */
export function updateActiveLeaf(conversationId: string, leafId: string): void {
  db.prepare(`
    UPDATE conversations
    SET active_leaf_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(leafId, conversationId);
}

/**
 * Get siblings of a message (messages with the same parent_id)
 * Returns the sibling messages and the index of the current message
 */
export function getSiblings(
  messageId: string
): { messages: MessageRecord[]; currentIndex: number } {
  // First get the message to find its parent_id
  const message = db
    .prepare(`SELECT parent_id FROM messages WHERE id = ?`)
    .get(messageId) as { parent_id: string | null } | undefined;

  if (!message) {
    return { messages: [], currentIndex: -1 };
  }

  // Find all messages with the same parent_id
  let siblings: MessageRecord[];
  if (message.parent_id === null) {
    // Root messages - those with no parent
    siblings = db
      .prepare(
        `
        SELECT * FROM messages
        WHERE parent_id IS NULL
          AND conversation_id = (SELECT conversation_id FROM messages WHERE id = ?)
        ORDER BY created_at ASC
      `
      )
      .all(messageId) as MessageRecord[];
  } else {
    siblings = db
      .prepare(
        `
        SELECT * FROM messages
        WHERE parent_id = ?
        ORDER BY created_at ASC
      `
      )
      .all(message.parent_id) as MessageRecord[];
  }

  const currentIndex = siblings.findIndex((m) => m.id === messageId);

  return { messages: siblings, currentIndex };
}

/**
 * Build active path from root to active_leaf_id
 * Returns messages in order from root to leaf along the active branch
 */
export function getActivePath(conversationId: string): MessageRecord[] {
  // Get the conversation's active leaf
  const conv = db
    .prepare(`SELECT active_leaf_id FROM conversations WHERE id = ?`)
    .get(conversationId) as { active_leaf_id: string | null } | undefined;

  if (!conv || !conv.active_leaf_id) {
    // No active leaf - return empty path or fall back to linear order
    // For backwards compatibility, return all messages in created_at order
    return db
      .prepare(
        `
        SELECT * FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
      `
      )
      .all(conversationId) as MessageRecord[];
  }

  // Build path by walking up from leaf to root
  const path: MessageRecord[] = [];
  let currentId: string | null = conv.active_leaf_id;

  while (currentId) {
    const message = db
      .prepare(`SELECT * FROM messages WHERE id = ?`)
      .get(currentId) as MessageRecord | undefined;

    if (!message) break;

    path.unshift(message); // Add to beginning to maintain root-to-leaf order
    currentId = message.parent_id;
  }

  return path;
}

/**
 * Get all messages for a conversation (for tree building on client)
 * Includes parent_id for constructing the full tree structure
 */
export function getAllMessages(conversationId: string): MessageRecord[] {
  return db
    .prepare(
      `
      SELECT * FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `
    )
    .all(conversationId) as MessageRecord[];
}

import { nanoid } from 'nanoid';
import type { UIMessage } from 'ai';
import db from '../db';
import type { ConversationStatus } from '../db/schema';

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
 */
export function saveUserMessage(conversationId: string, message: UIMessage) {
  const { id, role, ...rest } = message;

  const insert = db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content)
    VALUES (?, ?, ?, ?)
  `);

  insert.run(id || nanoid(), conversationId, role, JSON.stringify(rest));

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
 */
export function saveAssistantMessages(
  conversationId: string,
  modelMessages: ResponseMessage[]
) {
  // Filter for only assistant messages
  const assistantMessages = modelMessages.filter((m) => m.role === 'assistant');

  if (assistantMessages.length === 0) return;

  // Convert model messages to a format we can store
  for (const msg of assistantMessages) {
    const messageId = msg.id || nanoid();

    // Check if this message already exists (upsert)
    const existing = db
      .prepare('SELECT id FROM messages WHERE id = ?')
      .get(messageId);

    // Handle content - can be string or array
    const contentArray = typeof msg.content === 'string'
      ? [{ type: 'text', text: msg.content }]
      : msg.content;

    // Build parts from the content array
    const parts = (contentArray as AssistantContentPart[]).map((part) => {
      if (part.type === 'text') {
        return { type: 'text', text: part.text };
      } else if (part.type === 'tool-call') {
        // Tool call part - store tool name, call id, and args
        return {
          type: `tool-${part.toolName}`,
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          state: 'input-available',
          input: part.args,
        };
      } else if (part.type === 'reasoning') {
        return { type: 'reasoning', text: part.text };
      }
      // Skip other types for now
      return null;
    }).filter(Boolean);

    const content = JSON.stringify({ parts });

    if (existing) {
      // Update existing message
      db.prepare(`
        UPDATE messages
        SET content = ?
        WHERE id = ?
      `).run(content, messageId);
    } else {
      // Insert new message
      db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content)
        VALUES (?, ?, ?, ?)
      `).run(messageId, conversationId, 'assistant', content);
    }
  }

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

import db from '../../db';

interface UpdateConversationBody {
  title?: string;
  model?: string;
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const body = await readBody<UpdateConversationBody>(event);

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Conversation ID is required',
    });
  }

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (body.title !== undefined) {
    updates.push('title = ?');
    values.push(body.title);
  }

  if (body.model !== undefined) {
    updates.push('model = ?');
    values.push(body.model);
  }

  if (updates.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No fields to update',
    });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  db.prepare(`
    UPDATE conversations
    SET ${updates.join(', ')}
    WHERE id = ?
  `).run(...values);

  return { success: true };
});

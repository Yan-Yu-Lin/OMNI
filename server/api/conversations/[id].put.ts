import db from '../../db';
import type { ProviderPreferences } from '~/types';

interface UpdateConversationBody {
  title?: string;
  model?: string;
  providerPreferences?: ProviderPreferences;
  pinned?: boolean;
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
  const values: (string | number | null)[] = [];

  if (body.title !== undefined) {
    updates.push('title = ?');
    values.push(body.title);
  }

  if (body.model !== undefined) {
    updates.push('model = ?');
    values.push(body.model);
  }

  if (body.providerPreferences !== undefined) {
    updates.push('provider_preferences = ?');
    values.push(JSON.stringify(body.providerPreferences));
  }

  if (body.pinned !== undefined) {
    updates.push('pinned = ?');
    values.push(body.pinned ? 1 : 0);
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

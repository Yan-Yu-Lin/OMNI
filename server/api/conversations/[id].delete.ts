import db from '../../db';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Conversation ID is required',
    });
  }

  // Messages are deleted via CASCADE
  db.prepare('DELETE FROM conversations WHERE id = ?').run(id);

  return { success: true };
});

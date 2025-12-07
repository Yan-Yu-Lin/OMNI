/**
 * SSE Endpoint for streaming chat responses
 *
 * Client connects via EventSource to receive real-time token updates
 * while the server continues processing even if client disconnects.
 */

import { streamManager } from '../../../utils/stream-manager';
import { nanoid } from 'nanoid';

export default defineEventHandler(async (event) => {
  const conversationId = getRouterParam(event, 'id');

  if (!conversationId) {
    throw createError({
      statusCode: 400,
      message: 'Conversation ID is required',
    });
  }

  // Generate unique client ID
  const clientId = nanoid();

  console.log(`[SSE] Client ${clientId} connecting to stream ${conversationId}`);

  // Set SSE headers
  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  // Create readable stream for SSE
  const stream = new ReadableStream<string>({
    start(controller) {
      // Register this client with StreamManager
      streamManager.addClient(conversationId, clientId, controller);

      // Send initial connection event
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);
    },
    cancel() {
      // Client disconnected
      console.log(`[SSE] Client ${clientId} disconnected from ${conversationId}`);
      streamManager.removeClient(conversationId, clientId);
    },
  });

  // Return the stream as SSE response
  return sendStream(event, stream);
});

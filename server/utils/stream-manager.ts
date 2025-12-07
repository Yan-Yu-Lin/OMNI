/**
 * StreamManager - Manages active AI streams and SSE connections
 *
 * Allows server to continue processing even if client disconnects,
 * and broadcasts chunks to all connected SSE clients.
 */

export interface StreamEvent {
  type: 'text-delta' | 'tool-call' | 'tool-result' | 'complete' | 'error';
  content?: string;
  toolName?: string;
  toolCallId?: string;
  args?: unknown;
  result?: unknown;
  error?: string;
}

interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController<string>;
}

interface ActiveStream {
  conversationId: string;
  clients: Map<string, SSEClient>;
  buffer: StreamEvent[]; // Buffer for late-joining clients
  status: 'streaming' | 'complete' | 'error';
  createdAt: number;
}

class StreamManager {
  private streams = new Map<string, ActiveStream>();

  // Cleanup old streams after 5 minutes
  private readonly STREAM_TTL = 5 * 60 * 1000;

  constructor() {
    // Periodic cleanup of old streams
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Register a new stream when chat starts
   */
  register(conversationId: string): void {
    // Clean up any existing stream for this conversation
    if (this.streams.has(conversationId)) {
      const existing = this.streams.get(conversationId)!;
      // Close all existing clients
      for (const client of existing.clients.values()) {
        try {
          client.controller.close();
        } catch {
          // Ignore if already closed
        }
      }
    }

    this.streams.set(conversationId, {
      conversationId,
      clients: new Map(),
      buffer: [],
      status: 'streaming',
      createdAt: Date.now(),
    });

    console.log(`[StreamManager] Registered stream for ${conversationId}`);
  }

  /**
   * Add an SSE client connection
   */
  addClient(
    conversationId: string,
    clientId: string,
    controller: ReadableStreamDefaultController<string>
  ): void {
    const stream = this.streams.get(conversationId);
    if (!stream) {
      // No active stream, send not_found and close
      this.sendEvent(controller, { type: 'error', error: 'Stream not found' });
      controller.close();
      return;
    }

    stream.clients.set(clientId, { id: clientId, controller });
    console.log(
      `[StreamManager] Client ${clientId} connected to ${conversationId} (${stream.clients.size} total)`
    );

    // Send buffered events to late-joining client
    for (const event of stream.buffer) {
      this.sendEvent(controller, event);
    }

    // If stream is already complete, send complete event
    if (stream.status === 'complete') {
      this.sendEvent(controller, { type: 'complete' });
      controller.close();
    } else if (stream.status === 'error') {
      this.sendEvent(controller, { type: 'error', error: 'Stream failed' });
      controller.close();
    }
  }

  /**
   * Remove an SSE client connection
   */
  removeClient(conversationId: string, clientId: string): void {
    const stream = this.streams.get(conversationId);
    if (stream) {
      stream.clients.delete(clientId);
      console.log(
        `[StreamManager] Client ${clientId} disconnected from ${conversationId} (${stream.clients.size} remaining)`
      );
    }
  }

  /**
   * Broadcast an event to all connected clients
   */
  broadcast(conversationId: string, event: StreamEvent): void {
    const stream = this.streams.get(conversationId);
    if (!stream) {
      console.warn(`[StreamManager] No stream found for ${conversationId}`);
      return;
    }

    // Add to buffer for late-joining clients
    stream.buffer.push(event);

    // Limit buffer size to prevent memory issues
    if (stream.buffer.length > 1000) {
      stream.buffer = stream.buffer.slice(-500);
    }

    // Send to all connected clients
    for (const client of stream.clients.values()) {
      try {
        this.sendEvent(client.controller, event);
      } catch (err) {
        console.error(`[StreamManager] Error sending to client ${client.id}:`, err);
        stream.clients.delete(client.id);
      }
    }
  }

  /**
   * Mark stream as complete
   */
  complete(conversationId: string): void {
    const stream = this.streams.get(conversationId);
    if (!stream) return;

    stream.status = 'complete';
    console.log(`[StreamManager] Stream ${conversationId} complete`);

    // Notify all clients
    for (const client of stream.clients.values()) {
      try {
        this.sendEvent(client.controller, { type: 'complete' });
        client.controller.close();
      } catch {
        // Ignore if already closed
      }
    }
    stream.clients.clear();
  }

  /**
   * Mark stream as error
   */
  error(conversationId: string, errorMessage: string): void {
    const stream = this.streams.get(conversationId);
    if (!stream) return;

    stream.status = 'error';
    console.log(`[StreamManager] Stream ${conversationId} error: ${errorMessage}`);

    // Notify all clients
    for (const client of stream.clients.values()) {
      try {
        this.sendEvent(client.controller, { type: 'error', error: errorMessage });
        client.controller.close();
      } catch {
        // Ignore if already closed
      }
    }
    stream.clients.clear();
  }

  /**
   * Get current stream status
   */
  getStatus(conversationId: string): 'streaming' | 'complete' | 'error' | 'not_found' {
    const stream = this.streams.get(conversationId);
    return stream?.status ?? 'not_found';
  }

  /**
   * Get buffer for a stream
   */
  getBuffer(conversationId: string): StreamEvent[] {
    const stream = this.streams.get(conversationId);
    return stream?.buffer ?? [];
  }

  /**
   * Send SSE event to a client
   */
  private sendEvent(controller: ReadableStreamDefaultController<string>, event: StreamEvent): void {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    controller.enqueue(data);
  }

  /**
   * Clean up old streams
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [id, stream] of this.streams.entries()) {
      if (now - stream.createdAt > this.STREAM_TTL && stream.status !== 'streaming') {
        this.streams.delete(id);
        console.log(`[StreamManager] Cleaned up old stream ${id}`);
      }
    }
  }
}

// Export singleton instance
export const streamManager = new StreamManager();

# Fix SSE streaming consumption

## Problem

Server-sent events never deliver incremental tokens because the AI SDK stream is never consumed. The current implementation attaches error handlers (`result.text.catch(...)`) but never reads `result.fullStream`, so the SDK backpressure prevents any `onChunk`/`onStepFinish` callbacks from firing. As a result, the SSE manager never broadcasts updates and clients see nothing until the job finishes.

## Root cause

- Vercel AI SDK requires consumers to iterate its async stream (`result.fullStream`, `result.stream`, etc.). Without consumption, the SDK buffers and never emits tokens.
- The existing `/server/api/chat.post.ts` handler launches `streamText` and sets up callbacks but forgets to read the stream, so no tokens or tool events flow.

## Implementation plan

1. **Consume the stream:**
   - After calling `streamText`, start an async function that `for await`s over `result.fullStream`.
   - Within the loop, handle each `part.type` (`text-delta`, `tool-call`, `tool-result`, `error`, etc.) and forward them to the SSE/message manager (`streamManager.broadcast(...)`).

2. **Fire-and-forget pattern:**
   - Wrap the loop in an immediately invoked async function (`const streamPromise = (async () => { ... })();`).
   - Attach `.catch(...)` to log failures and update job status.
   - Return `{ success: true, conversationId }` immediately so the HTTP request finishes while the background loop keeps consuming.

3. **Update `server/api/chat.post.ts`:**
   - Replace the current `result.text.catch(...)` with the `for await` consumption.
   - Ensure error handling within the loop updates persistence and broadcasts an error event.

4. **Verify SSE:**
   - Start a conversation that triggers streaming text or tools.
   - Confirm clients connected to the SSE endpoint receive incremental `text-delta` and tool events as the server consumes the stream.

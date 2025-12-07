# Task: Refactor Streaming Architecture

## Goal

Refactor the chat streaming system to use the Vercel AI SDK's built-in `consumeSseStream` option, which allows:
1. **Server keeps AI running** even if browser disconnects (tab closed, refresh, etc.)
2. **Browser gets live streaming** when connected
3. **Simpler code** using SDK patterns instead of custom SSE infrastructure

---

## Current Situation

### Architecture Overview (What We Have Now)

The app currently uses a **"fire-and-forget with custom SSE"** pattern:

```
1. Browser POSTs to /api/chat
2. Server starts AI streaming in background (fire-and-forget)
3. Server manually consumes `result.fullStream`
4. Server broadcasts events via custom StreamManager
5. POST returns immediately with { success: true }
6. Browser THEN connects to separate SSE endpoint /api/chat/stream/[id]
7. StreamManager broadcasts events to connected SSE clients
```

### The Problems

1. **Race Condition**: Browser connects to SSE AFTER POST returns, but AI may already be streaming - early events can be missed

2. **Manual Event Handling**: Code manually extracts `text-delta`, `tool-call`, `tool-result` from `fullStream` and broadcasts them - this duplicates what the SDK does internally

3. **Complex Infrastructure**: Custom StreamManager class manages connections, buffering, cleanup - all of which the SDK could handle

### Key Files to Understand

- `server/api/chat.post.ts` - Current manual stream consumption
- `server/utils/stream-manager.ts` - Custom SSE broadcasting (can be removed)
- `server/api/chat/stream/[id].get.ts` - Custom SSE endpoint (can be removed)
- `app/pages/chat/[id].vue` - Client-side SSE handling
- `server/utils/chat-persistence.ts` - Database persistence logic (keep this)

---

## The Solution: `consumeSseStream`

### What We Learned

The Vercel AI SDK v6 beta has a feature called `consumeSseStream` in `toUIMessageStreamResponse()`:

```typescript
return result.toUIMessageStreamResponse({
  consumeSseStream: async ({ stream }) => {
    // This runs server-side, INDEPENDENT of browser connection!
    // Even if browser closes tab, this keeps running
  }
});
```

This "tees" (splits) the stream:
- One copy goes to the browser via HTTP response (live streaming)
- One copy is consumed server-side (for persistence)

### Also Important

- `onFinish` callback fires even if client disconnects (with `isAborted` flag)
- The SDK handles all the SSE protocol details
- The SDK's `Chat` class (from `@ai-sdk/vue`) handles client-side streaming

---

## Refactoring Plan

### Step 1: Refactor Server (`server/api/chat.post.ts`)

Change from:
```
streamText() → manually consume fullStream → broadcast via StreamManager → return { success }
```

To:
```
streamText() → return toUIMessageStreamResponse({ consumeSseStream, onFinish })
```

The `consumeSseStream` callback should:
- Parse SSE events from the stream
- Save messages to database as they stream
- Handle tool calls and results

The `onFinish` callback should:
- Final save to database
- Update conversation status

### Step 2: Refactor Client (`app/pages/chat/[id].vue`)

Change from:
- Manual EventSource connection to `/api/chat/stream/[id]`
- Manual `handleSSEEvent()` function
- Manual message state updates

To:
- Use `Chat` class from `@ai-sdk/vue`
- Let SDK handle streaming protocol
- SDK manages message state

### Step 3: Remove Unused Code

- `server/utils/stream-manager.ts` - No longer needed
- `server/api/chat/stream/[id].get.ts` - No longer needed (SDK streams via POST response)

### Step 4: Handle Persistence Edge Cases

The `chat-persistence.ts` helpers should work mostly as-is, but may need adjustments for how `consumeSseStream` provides data.

---

## How to Approach This (For the Agent)

### 1. Load the Vercel AI SDK Skill

```
Use Skill tool with skill: "vercel:vercel-ai-sdk"
```

### 2. Read SDK Documentation

Focus on these topics:
- `toUIMessageStreamResponse()` options - look for `consumeSseStream`
- Vue/Nuxt integration with `Chat` class from `@ai-sdk/vue`
- `onFinish` callback and `isAborted` flag
- Stream protocols documentation

### 3. Explore the Codebase

Read these files to understand current implementation:
- `server/api/chat.post.ts`
- `app/pages/chat/[id].vue`
- `server/utils/chat-persistence.ts`

### 4. Implement the Refactor

Follow the plan above, but adapt based on what you learn from the SDK docs. The key insight is:
- `consumeSseStream` lets server process stream independently
- The HTTP response still streams to browser
- This achieves both goals: persistence AND live streaming

### 5. Test Considerations

- Text should stream live in the browser
- Tool calls should appear with their inputs/outputs
- Closing the tab mid-stream should NOT stop the AI
- Reopening the conversation should show the completed message

---

## Technical Notes

### Stack
- Nuxt 4.2.1 (Vue 3)
- Vercel AI SDK v6 beta (`ai: 6.0.0-beta.137`, `@ai-sdk/vue: 3.0.0-beta.137`)
- OpenRouter provider (`@openrouter/ai-sdk-provider`)
- SQLite via better-sqlite3

### Existing Persistence Flow

The `chat-persistence.ts` file has helpers:
- `saveUserMessage()` - Saves user message to DB
- `saveAssistantMessages()` - Consolidates assistant parts and saves
- `saveToolResults()` - Updates tool parts with outputs
- `setConversationStatus()` - Updates conversation status
- `autoGenerateTitle()` - Generates title from first message

These should be called from `consumeSseStream` and/or `onFinish`.

---

## Success Criteria

1. Streaming works: Text appears word-by-word in browser
2. Tool calls work: Tool cards show with input and output
3. Persistence works: Messages saved to database
4. Resilience works: Closing tab doesn't stop AI generation
5. Simplicity: StreamManager and custom SSE endpoint removed

# Streaming Architecture Notes

## Current Implementation Summary

### Server Side (works well, documented)

```
User sends message
       ↓
POST /api/chat
       ↓
streamText() → starts AI generation
       ↓
toUIMessageStreamResponse({
  consumeSseStream: consumeStream,  // Server keeps running even if browser disconnects
  onFinish: () => { /* save to DB */ }
})
       ↓
HTTP Response streams to browser (SSE format)
```

**Key Point**: `consumeSseStream` "tees" (duplicates) the stream - one copy goes to browser, one is consumed server-side. If browser closes, server-side consumption continues.

---

### Client Side (uses undocumented internal API)

```
Chat class created
       ↓
Internally creates Vue refs:
  - state.messagesRef (Ref<UIMessage[]>)
  - state.statusRef (Ref<ChatStatus>)
       ↓
We access these via: (chat as any).state.messagesRef
       ↓
watch(internalMessages, ...) triggers instantly on updates
       ↓
UI re-renders smoothly
```

---

## Why I Said It's "Undocumented/Risky"

### The Issue

The `Chat` class exposes a public API:
```typescript
chat.messages  // Returns UIMessage[] (raw value)
chat.status    // Returns string (raw value)
```

But internally it stores:
```typescript
// Inside Chat class (not in public docs)
class Chat {
  state = {
    messagesRef: ref<UIMessage[]>([]),
    statusRef: ref<ChatStatus>('ready'),
  }

  get messages() {
    return this.state.messagesRef.value;  // Returns value, not ref
  }
}
```

### Why Accessing `.state` is Risky

1. **Not in official docs** - I searched the Vercel AI SDK docs and didn't find `.state.messagesRef` documented
2. **Uses `as any`** - TypeScript doesn't know about it: `(chat as any).state`
3. **Internal structure could change** - SDK updates might rename/remove `.state`
4. **Svelte docs warn against this** - They mention you can't destructure class properties

### However...

Looking at your original code from `d24f6ed`, this pattern was there from day one and it works. The SDK team may consider this a stable internal API even if not documented. It's been working through multiple SDK versions.

---

## Logic Flow: How Streaming Works End-to-End

### 1. User Sends Message

```typescript
// [id].vue
await chat.value.sendMessage({ text });
```

### 2. Chat Class Makes Request

```typescript
// Inside @ai-sdk/vue Chat class
// Uses DefaultChatTransport to POST to /api/chat
fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ messages, conversationId }),
  // Streams response
});
```

### 3. Server Processes

```typescript
// server/api/chat.post.ts
const result = streamText({ model, messages, tools });
return result.toUIMessageStreamResponse({ consumeSseStream, onFinish });
```

### 4. SSE Stream Sent to Browser

Server sends events like:
```
data: {"type":"text-delta","delta":"Hello"}
data: {"type":"text-delta","delta":" world"}
data: {"type":"finish","finishReason":"stop"}
```

### 5. Chat Class Receives Stream

```typescript
// Inside Chat class (simplified)
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  // Parse SSE event
  // Update internal refs:
  this.state.messagesRef.value = [...updated];  // <-- This triggers Vue reactivity
}
```

### 6. Our Watch Triggers

```typescript
// [id].vue
watch(internalMessages, (newMessages) => {
  chatMessages.value = [...newMessages];  // UI updates instantly
}, { immediate: true, deep: true });
```

---

## Alternative Approaches (If Internal API Breaks)

### Option A: Polling (What We Had Before)

```typescript
setInterval(() => {
  chatMessages.value = [...chat.value.messages];
}, 100);
```
- **Pro**: Uses only public API
- **Con**: Chunky 100ms updates

### Option B: requestAnimationFrame Polling

```typescript
const sync = () => {
  chatMessages.value = [...chat.value.messages];
  requestAnimationFrame(sync);
};
sync();
```
- **Pro**: 60fps, smoother than setInterval
- **Con**: Still polling

### Option C: File Issue/PR with Vercel

Request they expose reactive refs officially:
```typescript
// Wishlist
chat.messagesRef  // Ref<UIMessage[]>
chat.statusRef    // Ref<ChatStatus>
```

---

## Key Files

| File | Role |
|------|------|
| `server/api/chat.post.ts` | Server-side streaming + persistence |
| `app/pages/chat/[id].vue` | Client-side Chat class usage |
| `server/utils/chat-persistence.ts` | DB save helpers |

---

## Investigation Points

If streaming breaks after SDK update:

1. Check if `(chat as any).state` still exists
2. Check if `state.messagesRef` is still a Vue ref
3. Look at SDK source: `node_modules/@ai-sdk/vue/dist/index.js`
4. Search for `messagesRef` or similar patterns
5. Fall back to polling if needed

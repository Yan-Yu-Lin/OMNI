# Task 2: Lazy Conversation Creation

## Objective
Don't create conversations in the database until the first message is actually sent. Prevents empty "New Conversation" entries from cluttering the sidebar.

## Context Files to Read First
- `server/api/chat.post.ts` - Main chat endpoint (lines 82-99 validation, persistence calls)
- `server/utils/chat-persistence.ts` - Message and conversation persistence
- `app/composables/useConversations.ts` - Client-side conversation management
- `app/layouts/default.vue` - handleNewChat function
- `app/pages/chat/[id].vue` - Chat page initialization

## Current Flow (Problem)
```
Click "New Chat" → POST /api/conversations (creates DB record) → Navigate to /chat/{id}
```
Result: Empty "New Conversation" entries appear in sidebar immediately.

## Desired Flow
```
Click "New Chat" → Generate ID client-side → Navigate to /chat/{id}
→ User sends first message → Auto-create conversation in DB → Appears in sidebar
```

## Implementation Approach: "D-Lite"

### 1. Server-Side Auto-Create (`server/api/chat.post.ts`)

Modify the chat endpoint to auto-create conversation if it doesn't exist:

- Remove or relax the strict `conversationId` validation (lines 82-87)
- Before `saveUserMessage()`, wrap in a transaction that:
  1. Checks if conversation exists
  2. If not, creates it with the provided ID, model, and default title
  3. Then saves the user message
- This ensures foreign key constraints are satisfied

### 2. Client-Side ID Generation (`app/layouts/default.vue`)

Update `handleNewChat()`:
- Generate ID using `nanoid()` instead of calling POST /api/conversations
- Navigate directly to `/chat/{newId}`
- No API call needed

### 3. Chat Page Handling (`app/pages/chat/[id].vue`)

Update `loadConversation()`:
- Handle case where conversation doesn't exist in DB yet (404)
- Don't redirect to home; instead, allow the page to work in "draft" mode
- Conversation will be created when first message is sent

### 4. Sidebar Update Timing
- `fetchConversations(true)` is already called in `onFinish` callback
- This will pick up the newly created conversation after first AI response

## Key Constraint
Sandbox tools need a stable conversation ID for workspace persistence. The client-generated `nanoid()` ID is used from the start, so workspace files are never orphaned.

## Acceptance Criteria
- [ ] Clicking "New Chat" does NOT create a database record
- [ ] Conversation appears in sidebar only after first message is sent
- [ ] Sandbox tools work correctly (workspace created with correct ID)
- [ ] No foreign key constraint errors
- [ ] Existing conversations continue to work normally

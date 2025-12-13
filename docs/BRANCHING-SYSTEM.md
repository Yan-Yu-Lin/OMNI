# Conversation Branching System

This document explains how the conversation branching system works, enabling users to edit messages, regenerate AI responses, and navigate between different conversation branches.

## Overview

The branching system allows conversations to form a **tree structure** instead of a linear sequence. Users can:
- **Edit** a previous message → creates a new branch from that point
- **Regenerate** an AI response → creates a sibling response
- **Navigate** between branches using `< 1/2 >` controls

---

## Database Schema

### Messages Table

Each message has a `parent_id` pointing to its parent message:

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  role TEXT,              -- 'user' | 'assistant'
  content TEXT,           -- JSON with message parts
  parent_id TEXT,         -- NULL for root, otherwise points to parent
  created_at DATETIME,
  FOREIGN KEY (parent_id) REFERENCES messages(id)
);

CREATE INDEX idx_messages_parent_id ON messages(parent_id);
```

### Conversations Table

Tracks which branch is currently active:

```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  active_leaf_id TEXT,    -- Points to the current endpoint message
  -- ... other fields
  FOREIGN KEY (active_leaf_id) REFERENCES messages(id)
);
```

---

## Tree Structure Example

```
msg_1 (user: "hello")              parent_id: NULL
  └── msg_2 (assistant: "hi!")     parent_id: msg_1
        └── msg_3 (user: "how?")   parent_id: msg_2
              ├── msg_4 (assistant: "I'm good")   parent_id: msg_3  ← Branch A
              └── msg_5 (assistant: "I'm great")  parent_id: msg_3  ← Branch B
                    └── msg_6 (user: "cool")      parent_id: msg_5
                          └── msg_7 (assistant)   parent_id: msg_6  ← active_leaf_id
```

If `active_leaf_id = msg_7`, the **active path** is: `[msg_1, msg_2, msg_3, msg_5, msg_6, msg_7]`

Note: `msg_4` is on a different branch and won't be displayed until the user switches to it.

---

## Key Components

### Server-Side

| File | Purpose |
|------|---------|
| `server/api/chat.post.ts` | Handles message creation with branching logic |
| `server/utils/chat-persistence.ts` | Database operations for messages |
| `server/api/conversations/[id].get.ts` | Returns all messages + activeLeafId |
| `server/api/conversations/[id]/switch-branch.post.ts` | Switches active branch |

### Client-Side

| File | Purpose |
|------|---------|
| `app/composables/useMessageTree.ts` | Tree building and path computation |
| `app/pages/chat/[id].vue` | Main chat page with edit/regenerate handlers |
| `app/components/chat/BranchNavigation.vue` | `< 1/2 >` navigation UI |

---

## How It Works

### 1. Building the Tree (Client)

When a conversation loads, `buildTree()` in `useMessageTree.ts` creates lookup maps:

```typescript
function buildTree(messages: BranchMessage[], leafId: string | null) {
  messageMap.clear();
  childrenMap.clear();
  activeLeafId = leafId;

  for (const msg of messages) {
    // Index by ID for quick lookup
    messageMap.set(msg.id, msg);

    // Group children by parent
    const parentKey = msg.parentId;
    if (!childrenMap.has(parentKey)) {
      childrenMap.set(parentKey, []);
    }
    childrenMap.get(parentKey).push(msg.id);
  }
}
```

### 2. Computing the Active Path

`getActivePath()` walks **backwards** from `active_leaf_id` to root:

```typescript
function getActivePath(): BranchMessage[] {
  if (!activeLeafId) return [];

  const path: BranchMessage[] = [];
  let currentId: string | null = activeLeafId;

  // Walk from leaf to root
  while (currentId) {
    const msg = messageMap.get(currentId);
    if (!msg) break;
    path.unshift(msg);        // Add to front (builds root→leaf order)
    currentId = msg.parentId; // Move to parent
  }

  return path;  // Returns [root, ..., leaf]
}
```

### 3. Syncing with Vercel AI SDK

The Vercel AI SDK maintains its own internal `messages` array. We must sync it with our computed path:

```typescript
// Access SDK internals
const anyChat = chat.value as any;

// Update the internal reactive ref
if (anyChat?.state?.messagesRef) {
  anyChat.state.messagesRef.value = ourComputedPath;
}

// Call setMessages if available
if (typeof anyChat.setMessages === 'function') {
  anyChat.setMessages(ourComputedPath);
}

// Update local state
chatMessages.value = ourComputedPath;
```

### 4. Handling Branch Actions

The client sends a `branchAction` field to indicate the operation type:

| Action | Description |
|--------|-------------|
| `submit` | Normal new message |
| `edit` | Editing an existing message (creates sibling user message) |
| `regenerate` | Regenerating AI response (creates sibling assistant message) |

> **Note:** We use `branchAction` instead of `trigger` because the Vercel AI SDK internally uses `trigger` and overwrites it with its own value.

---

## Operation Flows

### Normal Message Send

```
1. User types message, clicks send
2. Client: branchAction = 'submit', parentId = current active_leaf_id
3. Server: saves user message with parent_id
4. Server: streams AI response
5. Server: saves assistant message, updates active_leaf_id
6. Client: reloadAndRebuildTree() → displays new path
```

### Edit Message

```
1. User clicks edit on message (e.g., msg_3)
2. Client: gets parentId = msg_3's parent (msg_2)
3. Client: truncates SDK array to [msg_1, msg_2]
4. Client: branchAction = 'edit', parentId = msg_2
5. Server: saves NEW user message with parent_id = msg_2 (sibling to msg_3)
6. Server: streams AI response, saves, updates active_leaf_id
7. Client: reloadAndRebuildTree() → displays new branch
8. UI shows "< 1/2 >" on msg_3's siblings
```

### Regenerate AI Response

```
1. User clicks regenerate on assistant message (e.g., msg_4)
2. Client: gets parentId = msg_4's parent (msg_3, the user message)
3. Client: truncates SDK array to [msg_1, msg_2] (before msg_3)
4. Client: branchAction = 'regenerate', parentId = msg_3
5. Client: resends msg_3's text via sendMessage()
6. Server: sees branchAction = 'regenerate'
7. Server: does NOT save new user message (uses existing msg_3)
8. Server: saves NEW assistant message with parent_id = msg_3 (sibling to msg_4)
9. Client: reloadAndRebuildTree() → displays new branch
10. UI shows "< 1/2 >" on msg_4's siblings
```

### Switch Branch

```
1. User clicks ">" on branch navigation
2. Client: calls switchToBranch(conversationId, siblingMessageId)
3. Server: finds deepest leaf of that branch, updates active_leaf_id
4. Client: reloadAndRebuildTree() → displays selected branch
```

---

## Server-Side Branch Logic

In `server/api/chat.post.ts`:

```typescript
if (effectiveAction === 'regenerate') {
  // Don't save new user message - just create sibling assistant
  userMessageId = parentId;  // Use existing user message as parent

} else if (effectiveAction === 'edit') {
  // Save new user message as sibling
  userMessageId = userMessage.id;
  saveUserMessage(conversationId, userMessage, parentId);

} else {
  // Normal submit - save with derived parent
  let effectiveParentId = parentId;
  if (!effectiveParentId && !isNewConversation) {
    // Use current active_leaf_id as parent
    const conv = db.prepare('SELECT active_leaf_id FROM conversations WHERE id = ?')
      .get(conversationId);
    effectiveParentId = conv?.active_leaf_id;
  }
  userMessageId = userMessage.id;
  saveUserMessage(conversationId, userMessage, effectiveParentId);
}

// Later: save assistant message with userMessageId as parent
saveAssistantMessages(conversationId, mockMessages, userMessageId);
updateActiveLeaf(conversationId, assistantMessageId);
```

---

## Flow Diagram

```
USER CLICKS REGENERATE
         │
         ▼
┌─────────────────────────────┐
│ 1. Get parent user message  │
│    parentId = msg_3         │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 2. Truncate SDK array to    │
│    BEFORE user message      │
│    [msg_1, msg_2]           │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 3. Set branchAction =       │
│    'regenerate'             │
│    parentId = msg_3         │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 4. sendMessage(same text)   │
│    SDK adds new user msg    │
│    Server streams response  │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 5. Server: branchAction =   │
│    'regenerate' → DON'T     │
│    save new user message    │
│    Save assistant as        │
│    sibling (parent=msg_3)   │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 6. Update active_leaf_id    │
│    to new assistant msg     │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 7. Client: reloadAndRebuild │
│    Tree → getActivePath()   │
│    → Swap SDK array         │
└─────────────────────────────┘
```

---

## SDK Compatibility Issues & Solutions

### 1. Empty Message ID

**Problem:** The SDK's `responseMessage.id` returns an empty string `""`, causing `active_leaf_id` to never be set.

**Solution:** Generate our own ID using `nanoid()`:
```typescript
const assistantMessageId = responseMessage.id || nanoid();
```

### 2. Field Name Collision

**Problem:** The SDK internally uses a field named `trigger` and overwrites any value we set.

**Solution:** Renamed our field to `branchAction`.

### 3. Internal State Access

**Note:** We access `chat.state.messagesRef` directly for instant reactivity. This is undocumented SDK behavior and may break in future versions.

---

## Truncation Before Send

Before sending an edit or regenerate, we truncate the SDK's array so the new message appears at the correct position:

```typescript
// For edit: truncate to BEFORE the edited message
const truncatedMessages = currentMessages.slice(0, editedIndex);

// For regenerate: truncate to BEFORE the user message
const messagesBeforeUser = chatMessages.value.slice(0, parentIndex);

// Then update SDK state
anyChat.state.messagesRef.value = truncatedMessages;
anyChat.setMessages(truncatedMessages);
chatMessages.value = truncatedMessages;
```

---

## Reloading After Operations

After any branch operation completes, we reload from the server to ensure consistency:

```typescript
const reloadAndRebuildTree = async () => {
  // Fetch fresh data from server
  const conv = await getConversation(conversationId);

  // Rebuild tree structure
  buildTree(conv.messages, conv.activeLeafId);

  // Compute new active path
  const newPath = getActivePath();

  // Sync everything
  chatMessages.value = newPath;
  anyChat.state.messagesRef.value = newPath;
  anyChat.setMessages(newPath);
};
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `server/db/index.ts` | Migration adding `parent_id`, `active_leaf_id` |
| `server/utils/chat-persistence.ts` | `saveUserMessage()`, `saveAssistantMessages()`, `updateActiveLeaf()`, `getActivePath()` |
| `server/api/chat.post.ts` | `branchAction` handling, nanoid for assistant ID |
| `server/api/conversations/[id].get.ts` | Returns `activeLeafId`, messages with `parentId` |
| `server/api/conversations/[id]/switch-branch.post.ts` | Branch switching endpoint |
| `app/types/index.ts` | `BranchMessage`, `SiblingInfo` types |
| `app/composables/useMessageTree.ts` | `buildTree()`, `getActivePath()`, `getSiblingInfo()`, `switchToBranch()` |
| `app/pages/chat/[id].vue` | `handleEdit()`, `submitEdit()`, `handleRegenerate()`, `reloadAndRebuildTree()` |
| `app/components/chat/BranchNavigation.vue` | `< 1/2 >` navigation component |
| `app/components/chat/Message.vue` | Displays branch navigation, edit/regenerate buttons |

---

## Testing Checklist

- [ ] Send normal messages → parent chain is correct in DB
- [ ] Edit first message → creates branch at root level
- [ ] Edit middle message → creates branch, navigation shows `< 1/2 >`
- [ ] Regenerate AI → creates sibling assistant, no duplicate user message
- [ ] Switch branch → displays correct path
- [ ] Refresh page → correct branch still displayed
- [ ] New messages after branch switch → continue from correct leaf
- [ ] Deep branching → multiple levels work correctly

---

## Visualization

See `docs/branching-visualization.html` for an interactive tree visualization.

# Conversation Branching System

## Overview

This document outlines the design for implementing conversation branching - the ability to edit messages or regenerate AI responses, creating alternative conversation paths that users can navigate between.

**User Experience Goal:**
- User edits a message → creates a new branch from that point
- User clicks "regenerate" on AI response → creates sibling response
- Navigation arrows `< 1/2 >` appear when a message has siblings
- User can switch between branches to explore different conversation paths

---

## Core Concept: Tree Structure with `parent_id`

Every message points to its parent. This creates a tree where:
- **Root message**: `parent_id = null`
- **Siblings**: Messages with the same `parent_id` (created by edit/regenerate)
- **Active path**: The chain from root to the currently viewed leaf

### Example Tree

```
User: "Hello" (msg_1, parent: null)
│
├─► AI: "Hi there!" (msg_2, parent: msg_1)      ← < 1/2 >
│   │
│   └─► User: "Tell me about Vue" (msg_3, parent: msg_2)
│       │
│       ├─► AI: "Vue is a framework..." (msg_4, parent: msg_3)    ← < 1/2 >
│       │   └─► User: "More details" (msg_5, parent: msg_4)
│       │       └─► AI: "Sure, Vue has..." (msg_6, parent: msg_5)
│       │
│       └─► AI: "Vue.js is progressive..." (msg_7, parent: msg_3)  [regenerate]
│           └─► User: "What about React?" (msg_8, parent: msg_7)
│               └─► AI: "React is..." (msg_9, parent: msg_8)
│
└─► AI: "Hey! How can I help?" (msg_10, parent: msg_1)  [regenerate]
    └─► User: "What's 2+2?" (msg_11, parent: msg_10)
        └─► AI: "4" (msg_12, parent: msg_11)
```

### Key Operations

| Operation | Result |
|-----------|--------|
| Find siblings | `SELECT * FROM messages WHERE parent_id = X` |
| Count siblings | `SELECT COUNT(*) FROM messages WHERE parent_id = X` |
| Get active path | Walk up from leaf following `parent_id` until null |
| Create branch | Insert new message with same `parent_id` as sibling |

---

## Data Model Changes

### Current Schema (messages table)
```sql
id              TEXT PRIMARY KEY
conversation_id TEXT
role            TEXT (user/assistant)
content         TEXT (JSON)
created_at      TEXT
updated_at      TEXT
```

### Proposed Addition
```sql
parent_id       TEXT (nullable, references messages.id)
```

- `parent_id = null` → root message (first message in conversation)
- `parent_id = <msg_id>` → this message follows that parent

### Tracking Active Branch

We need to know which leaf the user is currently viewing. Options:

**Option A: Store in conversation metadata**
```sql
-- conversations table
active_leaf_id  TEXT (references messages.id)
```

**Option B: Store active child per message**
```sql
-- messages table
active_child_id TEXT (nullable, references messages.id)
```

**Option C: Derive from URL/state**
- Store current leaf ID in URL: `/chat/abc123?leaf=msg_6`
- Or in client-side state

**Recommendation:** Option A is simplest - one field tracks where the user "is" in the tree.

---

## Implementation Components

### 1. Database Migration
- Add `parent_id` column to messages table
- Add `active_leaf_id` to conversations table (or chosen tracking method)
- Existing messages: set `parent_id` based on sequence (each message points to previous)

### 2. API Changes

**When saving messages:**
- Include `parent_id` when creating a message
- For normal flow: `parent_id` = previous message's ID
- For edit/regenerate: `parent_id` = same as the sibling's parent

**When loading conversation:**
- Return messages as flat list with `parent_id` field
- Client builds tree structure
- Or: server builds tree and returns nested structure

**When sending to AI:**
- Only send the active path (root → current leaf)
- Not the entire tree

### 3. UI Components

**Branch Navigation (`< 1/2 >`):**
- Show on messages that have siblings
- Display: `< {current_index} / {total_siblings} >`
- Left/right arrows to switch between siblings
- Switching updates `active_leaf_id` and re-renders the path

**Edit Button (user messages):**
- Opens message for editing
- On submit: creates new user message with same `parent_id`
- Then triggers AI response (child of the new message)

**Regenerate Button (AI messages):**
- Creates new AI message with same `parent_id` as current
- Streams new response
- User can then navigate between original and regenerated

### 4. State Management

Client needs to track:
- Full message tree (all branches)
- Active path (currently displayed messages)
- Current leaf ID

When user navigates branches:
- Update active leaf ID
- Recalculate active path
- Re-render message list

---

## AI Context Handling

The AI should only "see" the active path, not all branches.

**Example:** If user is viewing `msg_6` in the tree above:
```
Active path: msg_1 → msg_2 → msg_3 → msg_4 → msg_5 → msg_6

Send to AI:
[
  { role: "user", content: "Hello" },
  { role: "assistant", content: "Hi there!" },
  { role: "user", content: "Tell me about Vue" },
  { role: "assistant", content: "Vue is a framework..." },
  { role: "user", content: "More details" },
  { role: "assistant", content: "Sure, Vue has..." }
]
```

The AI never sees msg_7, msg_8, msg_9, msg_10, msg_11, msg_12 - those are on different branches.

---

## Open Questions for Research

1. **Migration strategy**: How to migrate existing linear conversations to tree structure?
   - Set each message's `parent_id` to the previous message's ID
   - Set `active_leaf_id` to the last message

2. **Vercel AI SDK compatibility**: Does the SDK support non-linear message arrays?
   - May need to flatten tree to array before sending
   - Check how `UIMessage` type handles this

3. **Streaming with branches**: When regenerating, how to handle the stream?
   - Create placeholder message, stream into it
   - On complete, it becomes a sibling

4. **Performance**: For very branched conversations, loading entire tree may be slow
   - Consider lazy loading branches
   - Or limit branch depth

5. **UI/UX details**:
   - Where exactly to show `< 1/2 >` navigation?
   - How to indicate "you're not on the main branch"?
   - Should collapsed branches be visible somehow?

---

## Implementation Priority

| Phase | Task | Complexity |
|-------|------|------------|
| 1 | Database schema migration | Low |
| 2 | API: save with parent_id | Low |
| 3 | API: load and build tree | Medium |
| 4 | UI: branch navigation component | Medium |
| 5 | Edit message flow | Medium |
| 6 | Regenerate flow | Medium |
| 7 | AI context (active path only) | Low |

---

## Related Files

Current implementation (for reference during research):
- `server/db/index.ts` - Database schema and migrations
- `server/api/chat.post.ts` - Chat streaming endpoint
- `server/utils/chat-persistence.ts` - Message saving logic
- `app/pages/chat/[id].vue` - Chat page, message handling
- `app/components/chat/Message.vue` - Message component (has edit/regenerate buttons)
- `app/composables/useConversations.ts` - Conversation state management

---

## References

- Visualization: `docs/branching-visualization.html`
- Similar implementations: ChatGPT, Claude.ai both support this pattern

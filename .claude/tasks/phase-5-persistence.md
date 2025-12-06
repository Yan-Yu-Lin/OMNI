# Phase 5: Conversation Persistence

> Save and load conversations to/from SQLite database.

---

## Prerequisites

- Phase 4 completed
- All tools working
- SQLite database set up (from Phase 1)

---

## Skills to Load

```
Invoke skill: vercel-ai-sdk
```

Key documentation:
- `Chatbot Message Persistence.md`

---

## Tasks

### Task 5.1: Create Conversation API Routes

**Create `server/api/conversations/index.get.ts`:**

```typescript
import db from '../../db';
import type { ConversationRecord } from '../../db/schema';

export default defineEventHandler(async () => {
  const conversations = db.prepare(`
    SELECT id, title, model, created_at, updated_at
    FROM conversations
    ORDER BY updated_at DESC
  `).all() as ConversationRecord[];

  return conversations.map(conv => ({
    id: conv.id,
    title: conv.title,
    model: conv.model,
    createdAt: conv.created_at,
    updatedAt: conv.updated_at,
  }));
});
```

**Create `server/api/conversations/index.post.ts`:**

```typescript
import { nanoid } from 'nanoid';
import db from '../../db';

interface CreateConversationBody {
  title?: string;
  model?: string;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateConversationBody>(event);

  const id = nanoid();
  const title = body.title || 'New Conversation';
  const model = body.model || null;

  db.prepare(`
    INSERT INTO conversations (id, title, model)
    VALUES (?, ?, ?)
  `).run(id, title, model);

  const conversation = db.prepare(`
    SELECT id, title, model, created_at, updated_at
    FROM conversations
    WHERE id = ?
  `).get(id) as any;

  return {
    id: conversation.id,
    title: conversation.title,
    model: conversation.model,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
  };
});
```

**Create `server/api/conversations/[id].get.ts`:**

```typescript
import db from '../../db';
import type { ConversationRecord, MessageRecord } from '../../db/schema';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Conversation ID is required',
    });
  }

  const conversation = db.prepare(`
    SELECT id, title, model, created_at, updated_at
    FROM conversations
    WHERE id = ?
  `).get(id) as ConversationRecord | undefined;

  if (!conversation) {
    throw createError({
      statusCode: 404,
      message: 'Conversation not found',
    });
  }

  const messages = db.prepare(`
    SELECT id, conversation_id, role, content, created_at
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `).all(id) as MessageRecord[];

  return {
    id: conversation.id,
    title: conversation.title,
    model: conversation.model,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
    messages: messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      ...JSON.parse(msg.content), // content stores the full UIMessage structure
    })),
  };
});
```

**Create `server/api/conversations/[id].put.ts`:**

```typescript
import db from '../../db';

interface UpdateConversationBody {
  title?: string;
  model?: string;
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
  const values: any[] = [];

  if (body.title !== undefined) {
    updates.push('title = ?');
    values.push(body.title);
  }

  if (body.model !== undefined) {
    updates.push('model = ?');
    values.push(body.model);
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
```

**Create `server/api/conversations/[id].delete.ts`:**

```typescript
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
```

---

### Task 5.2: Create Messages API Route

**Create `server/api/conversations/[id]/messages.post.ts`:**

```typescript
import { nanoid } from 'nanoid';
import db from '../../../db';
import type { UIMessage } from 'ai';

interface SaveMessagesBody {
  messages: UIMessage[];
}

export default defineEventHandler(async (event) => {
  const conversationId = getRouterParam(event, 'id');
  const body = await readBody<SaveMessagesBody>(event);

  if (!conversationId) {
    throw createError({
      statusCode: 400,
      message: 'Conversation ID is required',
    });
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    throw createError({
      statusCode: 400,
      message: 'Messages array is required',
    });
  }

  // Delete existing messages for this conversation
  db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(conversationId);

  // Insert new messages
  const insert = db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content)
    VALUES (?, ?, ?, ?)
  `);

  const insertMany = db.transaction((messages: UIMessage[]) => {
    for (const msg of messages) {
      const { id, role, ...rest } = msg;
      insert.run(
        id || nanoid(),
        conversationId,
        role,
        JSON.stringify(rest)
      );
    }
  });

  insertMany(body.messages);

  // Update conversation timestamp
  db.prepare(`
    UPDATE conversations
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(conversationId);

  return { success: true };
});
```

---

### Task 5.3: Create Conversations Composable

**Create `composables/useConversations.ts`:**

```typescript
import type { Conversation, ConversationWithMessages } from '~/types';

export function useConversations() {
  const conversations = ref<Conversation[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Fetch all conversations
  const fetchConversations = async () => {
    loading.value = true;
    error.value = null;

    try {
      conversations.value = await $fetch('/api/conversations');
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch conversations';
      console.error('Failed to fetch conversations:', e);
    } finally {
      loading.value = false;
    }
  };

  // Get single conversation with messages
  const getConversation = async (id: string): Promise<ConversationWithMessages | null> => {
    try {
      return await $fetch(`/api/conversations/${id}`);
    } catch (e) {
      console.error('Failed to fetch conversation:', e);
      return null;
    }
  };

  // Create new conversation
  const createConversation = async (data: { title?: string; model?: string } = {}) => {
    try {
      const conversation = await $fetch('/api/conversations', {
        method: 'POST',
        body: data,
      });
      conversations.value.unshift(conversation);
      return conversation;
    } catch (e) {
      console.error('Failed to create conversation:', e);
      throw e;
    }
  };

  // Update conversation
  const updateConversation = async (id: string, data: { title?: string; model?: string }) => {
    try {
      await $fetch(`/api/conversations/${id}`, {
        method: 'PUT',
        body: data,
      });

      // Update local state
      const index = conversations.value.findIndex(c => c.id === id);
      if (index !== -1) {
        conversations.value[index] = {
          ...conversations.value[index],
          ...data,
        };
      }
    } catch (e) {
      console.error('Failed to update conversation:', e);
      throw e;
    }
  };

  // Delete conversation
  const deleteConversation = async (id: string) => {
    try {
      await $fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      });

      // Remove from local state
      conversations.value = conversations.value.filter(c => c.id !== id);
    } catch (e) {
      console.error('Failed to delete conversation:', e);
      throw e;
    }
  };

  // Save messages
  const saveMessages = async (conversationId: string, messages: any[]) => {
    try {
      await $fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: { messages },
      });
    } catch (e) {
      console.error('Failed to save messages:', e);
    }
  };

  return {
    conversations,
    loading,
    error,
    fetchConversations,
    getConversation,
    createConversation,
    updateConversation,
    deleteConversation,
    saveMessages,
  };
}
```

---

### Task 5.4: Update Chat Composable for Persistence

**Update `composables/useAppChat.ts`:**

```typescript
import { Chat } from '@ai-sdk/vue';
import type { UIMessage } from 'ai';

interface UseAppChatOptions {
  conversationId?: string;
  initialMessages?: UIMessage[];
  onMessagesChange?: (messages: UIMessage[]) => void;
}

export function useAppChat(options: UseAppChatOptions = {}) {
  const chat = new Chat({
    api: '/api/chat',
    id: options.conversationId,
    initialMessages: options.initialMessages,
  });

  // Watch for message changes and notify
  if (options.onMessagesChange) {
    watch(
      () => [...chat.messages.value],
      (newMessages) => {
        options.onMessagesChange?.(newMessages);
      },
      { deep: true }
    );
  }

  const isStreaming = computed(() => {
    return chat.status.value === 'streaming' || chat.status.value === 'submitted';
  });

  const isReady = computed(() => {
    return chat.status.value === 'ready';
  });

  const sendMessage = (text: string) => {
    chat.sendMessage({ text });
  };

  return {
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    isStreaming,
    isReady,
    sendMessage,
  };
}
```

---

### Task 5.5: Create Sidebar Components

**Update `components/sidebar/ConversationItem.vue`:**

```vue
<template>
  <div
    class="conversation-item"
    :class="{ active: isActive }"
    @click="$emit('select')"
  >
    <div class="conversation-title">{{ conversation.title }}</div>
    <div class="conversation-meta">
      {{ formatDate(conversation.updatedAt) }}
    </div>

    <button
      class="delete-btn"
      @click.stop="$emit('delete')"
      title="Delete conversation"
    >
      ×
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Conversation } from '~/types';

defineProps<{
  conversation: Conversation;
  isActive?: boolean;
}>();

defineEmits<{
  select: [];
  delete: [];
}>();

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Today
  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // This week
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  // Older
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};
</script>

<style scoped>
.conversation-item {
  position: relative;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s;
}

.conversation-item:hover {
  background: #e8e8e8;
}

.conversation-item.active {
  background: #e0e0e0;
}

.conversation-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 24px;
}

.conversation-meta {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.delete-btn {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #999;
  font-size: 18px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.1s;
  border-radius: 4px;
}

.conversation-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #ddd;
  color: #666;
}
</style>
```

**Create `components/sidebar/ConversationList.vue`:**

```vue
<template>
  <div class="conversation-list">
    <div v-if="loading" class="loading">Loading...</div>

    <div v-else-if="conversations.length === 0" class="empty">
      No conversations yet
    </div>

    <template v-else>
      <ConversationItem
        v-for="conv in conversations"
        :key="conv.id"
        :conversation="conv"
        :is-active="conv.id === activeId"
        @select="$emit('select', conv.id)"
        @delete="$emit('delete', conv.id)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Conversation } from '~/types';

defineProps<{
  conversations: Conversation[];
  activeId?: string;
  loading?: boolean;
}>();

defineEmits<{
  select: [id: string];
  delete: [id: string];
}>();
</script>

<style scoped>
.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.loading,
.empty {
  padding: 16px;
  text-align: center;
  color: #666;
  font-size: 14px;
}
</style>
```

---

### Task 5.6: Create Chat Page with Persistence

**Create `pages/chat/[id].vue`:**

```vue
<template>
  <AppLayout>
    <template #sidebar>
      <Sidebar @new-chat="handleNewChat">
        <ConversationList
          :conversations="conversations"
          :active-id="conversationId"
          :loading="loadingConversations"
          @select="handleSelectConversation"
          @delete="handleDeleteConversation"
        />
      </Sidebar>
    </template>

    <div v-if="loadingChat" class="loading-chat">
      Loading conversation...
    </div>

    <ChatContainer
      v-else
      :messages="messages"
      :is-streaming="isStreaming"
      @send="handleSend"
    />
  </AppLayout>
</template>

<script setup lang="ts">
const route = useRoute();
const router = useRouter();

const conversationId = computed(() => route.params.id as string);

const {
  conversations,
  loading: loadingConversations,
  fetchConversations,
  getConversation,
  createConversation,
  deleteConversation,
  saveMessages,
} = useConversations();

// Chat state
const loadingChat = ref(true);
const initialMessages = ref<any[]>([]);

// Load conversation
const loadConversation = async () => {
  loadingChat.value = true;

  const conv = await getConversation(conversationId.value);
  if (conv) {
    initialMessages.value = conv.messages;
  } else {
    // Conversation not found, redirect to home
    router.push('/');
    return;
  }

  loadingChat.value = false;
};

// Initialize chat with persistence
const { messages, sendMessage, isStreaming, status } = useAppChat({
  conversationId: conversationId.value,
  initialMessages: initialMessages.value,
});

// Save messages when they change (debounced)
let saveTimeout: NodeJS.Timeout;
watch(
  messages,
  (newMessages) => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (newMessages.length > 0) {
        saveMessages(conversationId.value, newMessages);
      }
    }, 1000); // Debounce 1 second
  },
  { deep: true }
);

// Auto-generate title after first exchange
watch(
  () => messages.value.length,
  async (length) => {
    if (length === 2) {
      // User message + AI response
      // TODO: Generate title using AI (Phase 6 or later)
      const userMessage = messages.value[0];
      if (userMessage?.parts?.[0]?.type === 'text') {
        const text = (userMessage.parts[0] as any).text;
        const title = text.slice(0, 50) + (text.length > 50 ? '...' : '');
        // Update title
        await $fetch(`/api/conversations/${conversationId.value}`, {
          method: 'PUT',
          body: { title },
        });
        // Refresh conversation list
        fetchConversations();
      }
    }
  }
);

const handleSend = (text: string) => {
  sendMessage(text);
};

const handleNewChat = async () => {
  const conv = await createConversation();
  router.push(`/chat/${conv.id}`);
};

const handleSelectConversation = (id: string) => {
  router.push(`/chat/${id}`);
};

const handleDeleteConversation = async (id: string) => {
  await deleteConversation(id);

  // If deleted current, go to home or another conversation
  if (id === conversationId.value) {
    if (conversations.value.length > 0) {
      router.push(`/chat/${conversations.value[0].id}`);
    } else {
      router.push('/');
    }
  }
};

// Load data on mount
onMounted(async () => {
  await Promise.all([
    fetchConversations(),
    loadConversation(),
  ]);
});

// Reload when conversation changes
watch(conversationId, () => {
  loadConversation();
});
</script>

<style scoped>
.loading-chat {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}
</style>
```

---

### Task 5.7: Update Home Page

**Update `pages/index.vue`:**

```vue
<template>
  <AppLayout>
    <template #sidebar>
      <Sidebar @new-chat="handleNewChat">
        <ConversationList
          :conversations="conversations"
          :loading="loading"
          @select="handleSelectConversation"
          @delete="handleDeleteConversation"
        />
      </Sidebar>
    </template>

    <div class="home-content">
      <div class="welcome">
        <h1>AI Chat</h1>
        <p>Start a new conversation or select one from the sidebar.</p>
        <button class="start-btn" @click="handleNewChat">
          New Conversation
        </button>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
const router = useRouter();

const {
  conversations,
  loading,
  fetchConversations,
  createConversation,
  deleteConversation,
} = useConversations();

const handleNewChat = async () => {
  const conv = await createConversation();
  router.push(`/chat/${conv.id}`);
};

const handleSelectConversation = (id: string) => {
  router.push(`/chat/${id}`);
};

const handleDeleteConversation = async (id: string) => {
  await deleteConversation(id);
};

onMounted(() => {
  fetchConversations();
});
</script>

<style scoped>
.home-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.welcome {
  text-align: center;
}

.welcome h1 {
  font-size: 32px;
  margin-bottom: 8px;
}

.welcome p {
  color: #666;
  margin-bottom: 24px;
}

.start-btn {
  padding: 12px 24px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.start-btn:hover {
  background: #333;
}
</style>
```

---

## Acceptance Criteria

- [ ] Conversations list shows in sidebar
- [ ] Can create new conversation
- [ ] Can select and load existing conversation
- [ ] Can delete conversation
- [ ] Messages persist when navigating away and back
- [ ] New conversations auto-generate title from first message
- [ ] Timestamps show relative time (today, this week, older)

---

## Testing

1. **Test creation:**
   - Click "New Chat"
   - Send a message
   - Check sidebar shows new conversation

2. **Test persistence:**
   - Send a few messages
   - Navigate away (click another conversation or refresh)
   - Come back - messages should be there

3. **Test deletion:**
   - Delete a conversation
   - Verify it's removed from sidebar
   - Verify redirects if current was deleted

---

## Files Created/Modified

```
server/api/conversations/
├── index.get.ts              # NEW
├── index.post.ts             # NEW
├── [id].get.ts               # NEW
├── [id].put.ts               # NEW
├── [id].delete.ts            # NEW
└── [id]/
    └── messages.post.ts      # NEW

composables/
├── useAppChat.ts             # MODIFIED
└── useConversations.ts       # NEW

components/sidebar/
├── ConversationItem.vue      # NEW
└── ConversationList.vue      # NEW

pages/
├── index.vue                 # MODIFIED
└── chat/
    └── [id].vue              # NEW
```

---

## Next Phase

Once Phase 5 is complete, proceed to **Phase 6: Settings** to add configuration options.

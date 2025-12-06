# Phase 2: Core Chat (No Tools)

> Get basic chat working with streaming responses from OpenRouter.

---

## Prerequisites

- Phase 1 completed
- `.env` file has `NUXT_OPENROUTER_API_KEY` set
- `pnpm dev` runs without errors

---

## Skills to Load

Before starting this phase, load these skills for reference:

```
Invoke skill: vercel-ai-sdk
Invoke skill: openrouter
```

Key documentation to reference:
- Vercel AI SDK: `Vue.js (Nuxt) Quickstart.md`, `Chatbot.md`
- OpenRouter: `Vercel AI SDK.md`

---

## Tasks

### Task 2.1: Create OpenRouter Client Utility

**Create `server/utils/openrouter.ts`:**

```typescript
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

let openrouterClient: ReturnType<typeof createOpenRouter> | null = null;

export function getOpenRouterClient() {
  if (!openrouterClient) {
    const config = useRuntimeConfig();

    if (!config.openrouterApiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    openrouterClient = createOpenRouter({
      apiKey: config.openrouterApiKey,
    });
  }

  return openrouterClient;
}
```

---

### Task 2.2: Create Type Definitions

**Create `types/index.ts`:**

```typescript
// Re-export from ai package for convenience
export type { UIMessage } from 'ai';

// Conversation types
export interface Conversation {
  id: string;
  title: string;
  model: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationWithMessages extends Conversation {
  messages: UIMessage[];
}

// Settings types
export interface Settings {
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  firecrawlMode: 'self-hosted' | 'cloud';
  firecrawlSelfHostedUrl: string;
  firecrawlApiKey: string;
}

export const defaultSettings: Settings = {
  model: 'anthropic/claude-3.5-sonnet',
  systemPrompt: 'You are a helpful assistant.',
  temperature: 1,
  maxTokens: 4096,
  firecrawlMode: 'self-hosted',
  firecrawlSelfHostedUrl: 'http://localhost:3002',
  firecrawlApiKey: '',
};

// Chat request type
export interface ChatRequest {
  messages: UIMessage[];
  conversationId?: string;
  model?: string;
}
```

---

### Task 2.3: Create Chat API Endpoint

**Create `server/api/chat.post.ts`:**

```typescript
import {
  streamText,
  UIMessage,
  convertToModelMessages,
} from 'ai';
import { getOpenRouterClient } from '../utils/openrouter';
import type { ChatRequest } from '~/types';

export default defineEventHandler(async (event) => {
  const body = await readBody<ChatRequest>(event);
  const { messages, model } = body;

  if (!messages || !Array.isArray(messages)) {
    throw createError({
      statusCode: 400,
      message: 'Messages array is required',
    });
  }

  const openrouter = getOpenRouterClient();

  // Use provided model or default
  const selectedModel = model || 'anthropic/claude-3.5-sonnet';

  const result = streamText({
    model: openrouter(selectedModel),
    system: 'You are a helpful assistant.',
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
});
```

---

### Task 2.4: Create Chat UI Components

**Create `components/chat/Input.vue`:**

```vue
<template>
  <form class="chat-input" @submit.prevent="handleSubmit">
    <textarea
      ref="textareaRef"
      v-model="input"
      placeholder="Type a message..."
      rows="1"
      @keydown="handleKeydown"
    />
    <button type="submit" :disabled="!input.trim() || disabled">
      Send
    </button>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  submit: [text: string];
}>();

const input = ref('');
const textareaRef = ref<HTMLTextAreaElement>();

const handleSubmit = () => {
  const text = input.value.trim();
  if (text && !props.disabled) {
    emit('submit', text);
    input.value = '';
    // Reset height
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto';
    }
  }
};

const handleKeydown = (e: KeyboardEvent) => {
  // Submit on Enter (without Shift)
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
};

// Auto-resize textarea
watch(input, () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
    textareaRef.value.style.height = textareaRef.value.scrollHeight + 'px';
  }
});
</script>

<style scoped>
.chat-input {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  background: #fff;
}

textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  resize: none;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  max-height: 200px;
  overflow-y: auto;
}

textarea:focus {
  outline: none;
  border-color: #000;
}

button {
  padding: 12px 24px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

button:hover:not(:disabled) {
  background: #333;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
```

**Create `components/chat/Message.vue`:**

```vue
<template>
  <div class="message" :class="message.role">
    <div class="message-role">
      {{ message.role === 'user' ? 'You' : 'AI' }}
    </div>
    <div class="message-content">
      <template v-for="(part, index) in message.parts" :key="index">
        <div v-if="part.type === 'text'" class="text-part">
          {{ part.text }}
        </div>
        <!-- Tool parts will be handled in Phase 3 -->
        <div v-else class="unknown-part">
          [{{ part.type }}]
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UIMessage } from 'ai';

defineProps<{
  message: UIMessage;
}>();
</script>

<style scoped>
.message {
  padding: 16px 24px;
}

.message.user {
  background: #f5f5f5;
}

.message.assistant {
  background: #fff;
}

.message-role {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  color: #333;
}

.message-content {
  font-size: 15px;
  line-height: 1.6;
  color: #333;
}

.text-part {
  white-space: pre-wrap;
  word-break: break-word;
}

.unknown-part {
  color: #999;
  font-style: italic;
}
</style>
```

**Create `components/chat/MessageList.vue`:**

```vue
<template>
  <div ref="containerRef" class="message-list">
    <template v-if="messages.length === 0">
      <div class="empty-state">
        <p>Start a conversation</p>
      </div>
    </template>
    <template v-else>
      <Message
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />
    </template>

    <div v-if="isStreaming" class="streaming-indicator">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UIMessage } from 'ai';

const props = defineProps<{
  messages: UIMessage[];
  isStreaming?: boolean;
}>();

const containerRef = ref<HTMLElement>();

// Auto-scroll to bottom when messages change
watch(
  () => props.messages.length,
  () => {
    nextTick(() => {
      if (containerRef.value) {
        containerRef.value.scrollTop = containerRef.value.scrollHeight;
      }
    });
  }
);

// Also scroll when streaming
watch(
  () => props.messages[props.messages.length - 1]?.parts?.length,
  () => {
    nextTick(() => {
      if (containerRef.value) {
        containerRef.value.scrollTop = containerRef.value.scrollHeight;
      }
    });
  }
);
</script>

<style scoped>
.message-list {
  flex: 1;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.streaming-indicator {
  display: flex;
  gap: 4px;
  padding: 16px 24px;
}

.dot {
  width: 8px;
  height: 8px;
  background: #666;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
</style>
```

**Create `components/chat/Container.vue`:**

```vue
<template>
  <div class="chat-container">
    <MessageList
      :messages="messages"
      :is-streaming="isStreaming"
    />
    <Input
      :disabled="isStreaming"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import type { UIMessage } from 'ai';

const props = defineProps<{
  messages: UIMessage[];
  isStreaming?: boolean;
}>();

const emit = defineEmits<{
  send: [text: string];
}>();

const handleSubmit = (text: string) => {
  emit('send', text);
};
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
```

---

### Task 2.5: Create Chat Composable

**Create `composables/useAppChat.ts`:**

```typescript
import { Chat } from '@ai-sdk/vue';
import type { UIMessage } from 'ai';

interface UseAppChatOptions {
  conversationId?: string;
  initialMessages?: UIMessage[];
}

export function useAppChat(options: UseAppChatOptions = {}) {
  const chat = new Chat({
    api: '/api/chat',
    id: options.conversationId,
    initialMessages: options.initialMessages,
  });

  // Computed helpers
  const isStreaming = computed(() => {
    return chat.status.value === 'streaming' || chat.status.value === 'submitted';
  });

  const isReady = computed(() => {
    return chat.status.value === 'ready';
  });

  const hasError = computed(() => {
    return chat.status.value === 'error';
  });

  // Send message helper
  const sendMessage = (text: string) => {
    chat.sendMessage({ text });
  };

  return {
    // State
    messages: chat.messages,
    status: chat.status,
    error: chat.error,

    // Computed
    isStreaming,
    isReady,
    hasError,

    // Actions
    sendMessage,
  };
}
```

---

### Task 2.6: Update Main Page

**Update `pages/index.vue`:**

```vue
<template>
  <AppLayout>
    <template #sidebar>
      <Sidebar @new-chat="handleNewChat">
        <p style="padding: 16px; color: #666; font-size: 14px;">
          No conversations yet
        </p>
      </Sidebar>
    </template>

    <ChatContainer
      :messages="messages"
      :is-streaming="isStreaming"
      @send="handleSend"
    />
  </AppLayout>
</template>

<script setup lang="ts">
const { messages, sendMessage, isStreaming } = useAppChat();

const handleSend = (text: string) => {
  sendMessage(text);
};

const handleNewChat = () => {
  // Refresh the page to start new chat
  // Proper implementation in Phase 5
  window.location.reload();
};
</script>
```

---

## Acceptance Criteria

- [ ] Can type a message and send it
- [ ] Message appears in chat as "You"
- [ ] AI response streams in real-time
- [ ] AI response shows as "AI"
- [ ] Streaming indicator shows while AI is responding
- [ ] Can have multi-turn conversation
- [ ] Auto-scrolls to bottom on new messages
- [ ] Enter key sends message (Shift+Enter for newline)

---

## Testing

1. Start the dev server:
```bash
pnpm dev
```

2. Open http://localhost:3000

3. Type a message like "Hello, who are you?" and press Enter

4. Verify:
   - Your message appears immediately
   - Streaming indicator shows
   - AI response streams in word by word
   - Can continue the conversation

5. Test edge cases:
   - Empty message (should not send)
   - Very long message
   - Rapid messages

---

## Troubleshooting

**"OPENROUTER_API_KEY is not configured"**
- Ensure `.env` has `NUXT_OPENROUTER_API_KEY=sk-or-...`
- Restart dev server after changing `.env`

**Stream not working**
- Check browser console for errors
- Check server terminal for errors
- Verify API key is valid at https://openrouter.ai/keys

**"Cannot find module '@ai-sdk/vue'"**
- Run `pnpm add ai@beta @ai-sdk/vue@beta`

---

## Files Created/Modified

```
server/
├── api/
│   └── chat.post.ts          # NEW
└── utils/
    └── openrouter.ts         # NEW

components/chat/
├── Container.vue             # NEW
├── Input.vue                 # NEW
├── Message.vue               # NEW
└── MessageList.vue           # NEW

composables/
└── useAppChat.ts             # NEW

types/
└── index.ts                  # NEW

pages/
└── index.vue                 # MODIFIED
```

---

## Next Phase

Once Phase 2 is complete, proceed to **Phase 3: Tool Infrastructure** to add tool calling support.

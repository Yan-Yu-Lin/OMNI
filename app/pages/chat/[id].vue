<template>
  <div v-if="loadingChat" class="loading-chat">
    Loading conversation...
  </div>

  <template v-else>
    <!-- Chat header with model selector -->
    <header class="chat-header">
      <ModelsModelSelector
        v-model="selectedModelId"
        :models="models"
      />
    </header>

    <ChatContainer
      :messages="chatMessages"
      :is-streaming="isStreaming"
      @send="handleSend"
    />
  </template>
</template>

<script setup lang="ts">
import { Chat } from '@ai-sdk/vue';
import { DefaultChatTransport, type UIMessage } from 'ai';
import type { ConversationStatus } from '~/types';

const route = useRoute();
const router = useRouter();

const conversationId = computed(() => route.params.id as string);

const { fetchConversations, getConversation } = useConversations();

// Models composable for model selection
const { models, fetchModels } = useModels();

// Selected model - default to Claude Sonnet 4
const selectedModelId = ref('anthropic/claude-sonnet-4');

// Chat state
const loadingChat = ref(true);
const conversationStatus = ref<ConversationStatus>('idle');

// Chat instance - will be recreated when conversation changes
// Using shallowRef so we can track changes to the chat instance itself
const chat = shallowRef<Chat<UIMessage> | null>(null);

// Reactive messages - we'll sync this from the Chat instance
const chatMessages = ref<UIMessage[]>([]);

// Reactive status tracking
const chatStatus = ref<'ready' | 'submitted' | 'streaming' | 'error'>('ready');

// Computed streaming state
const isStreaming = computed(() =>
  chatStatus.value === 'streaming' || chatStatus.value === 'submitted'
);

// Store watchers for cleanup
let stopMessagesWatch: (() => void) | null = null;
let stopStatusWatch: (() => void) | null = null;

// Create or update the Chat instance
const initializeChat = (initialMessages: UIMessage[]) => {
  // Clean up previous watchers
  if (stopMessagesWatch) stopMessagesWatch();
  if (stopStatusWatch) stopStatusWatch();
  if (chat.value) {
    chat.value.stop();
  }

  // Create transport with conversationId and model in the body
  const transport = new DefaultChatTransport({
    api: '/api/chat',
    body: () => ({
      conversationId: conversationId.value,
      model: selectedModelId.value,
    }),
  });

  // Create new Chat instance
  const newChat = new Chat<UIMessage>({
    id: conversationId.value,
    messages: initialMessages,
    transport,
    onFinish: () => {
      console.log('[Chat] Stream finished');
      conversationStatus.value = 'idle';
      fetchConversations(true); // Force refresh to update title/timestamp
    },
    onError: (error) => {
      console.error('[Chat] Error:', error);
      conversationStatus.value = 'error';
    },
  });

  chat.value = newChat;

  // Access internal Vue refs for smooth streaming (instant updates, no polling)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chatState = (newChat as any).state;
  const internalMessages = chatState.messagesRef as Ref<UIMessage[]>;
  const internalStatus = chatState.statusRef as Ref<'ready' | 'submitted' | 'streaming' | 'error'>;

  // Watch internal refs - triggers instantly when stream updates
  stopMessagesWatch = watch(internalMessages, (newMessages) => {
    chatMessages.value = [...newMessages];
  }, { immediate: true, deep: true });

  stopStatusWatch = watch(internalStatus, (newStatus) => {
    chatStatus.value = newStatus;
  }, { immediate: true });
};

// Load conversation from server
const loadConversation = async () => {
  loadingChat.value = true;
  chatMessages.value = [];

  const conv = await getConversation(conversationId.value);
  if (conv) {
    conversationStatus.value = conv.status;
    
    // If conversation has a model, use it
    if (conv.model) {
      selectedModelId.value = conv.model;
    }
    
    initializeChat(conv.messages);

    // If conversation was streaming when we loaded, try to resume
    if (conv.status === 'streaming' && chat.value) {
      console.log('[Chat] Conversation was streaming, attempting to resume...');
      try {
        await chat.value.resumeStream();
      } catch (err) {
        console.log('[Chat] Could not resume stream, refreshing from DB...');
        await refreshFromDB();
      }
    }
  } else {
    // Conversation not found, redirect to home
    router.push('/');
    return;
  }

  loadingChat.value = false;
};

// Refresh from DB (fallback)
const refreshFromDB = async () => {
  try {
    const conv = await getConversation(conversationId.value);
    if (conv) {
      // Re-initialize chat with latest messages
      initializeChat(conv.messages);
      conversationStatus.value = conv.status;

      if (conv.status !== 'streaming') {
        // Refresh conversation list to show updated title/timestamp
        fetchConversations(true);
      }
    }
  } catch (err) {
    console.error('[Chat] Error refreshing from DB:', err);
  }
};

// Send a message
const handleSend = async (text: string) => {
  // Check if already streaming
  if (chatStatus.value === 'streaming' || chatStatus.value === 'submitted') {
    console.warn('[Chat] Already streaming, ignoring send request');
    return;
  }

  if (!chat.value) {
    console.error('[Chat] No chat instance');
    return;
  }

  // Optimistically set to streaming
  conversationStatus.value = 'streaming';

  try {
    // Use the SDK's sendMessage method - it handles everything
    await chat.value.sendMessage({ text });
  } catch (err) {
    console.error('[Chat] Error sending message:', err);
    conversationStatus.value = 'error';
  }
};

// Load conversation and models on mount
onMounted(() => {
  fetchModels();
  loadConversation();
});

// Cleanup on unmount
onUnmounted(() => {
  if (stopMessagesWatch) stopMessagesWatch();
  if (stopStatusWatch) stopStatusWatch();
  if (chat.value) {
    chat.value.stop();
  }
});

// Reload when conversation changes (handles navigation between conversations)
watch(conversationId, () => {
  if (chat.value) {
    chat.value.stop();
  }
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

.chat-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #fff;
  flex-shrink: 0;
}
</style>

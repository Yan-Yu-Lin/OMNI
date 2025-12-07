<template>
  <LayoutAppLayout>
    <template #sidebar>
      <LayoutSidebar @new-chat="handleNewChat">
        <SidebarConversationList
          :conversations="conversations"
          :active-id="conversationId"
          :loading="loadingConversations"
          @select="handleSelectConversation"
          @delete="handleDeleteConversation"
        />
      </LayoutSidebar>
    </template>

    <div v-if="loadingChat" class="loading-chat">
      Loading conversation...
    </div>

    <ChatContainer
      v-else
      :messages="chatMessages"
      :is-streaming="isStreaming"
      @send="handleSend"
    />
  </LayoutAppLayout>
</template>

<script setup lang="ts">
import { Chat } from '@ai-sdk/vue';
import { DefaultChatTransport, type UIMessage } from 'ai';
import type { ConversationStatus } from '~/types';

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
} = useConversations();

// Chat state
const loadingChat = ref(true);
const conversationStatus = ref<ConversationStatus>('idle');

// Chat instance - will be recreated when conversation changes
// Using shallowRef so we can track changes to the chat instance itself
const chat = shallowRef<Chat<UIMessage> | null>(null);

// Sync interval cleanup
let syncInterval: ReturnType<typeof setInterval> | null = null;

// Reactive messages - we'll sync this from the Chat instance
const chatMessages = ref<UIMessage[]>([]);

// Reactive status tracking
const chatStatus = ref<'ready' | 'submitted' | 'streaming' | 'error'>('ready');

// Computed streaming state
const isStreaming = computed(() =>
  chatStatus.value === 'streaming' || chatStatus.value === 'submitted'
);

// Create or update the Chat instance
const initializeChat = (initialMessages: UIMessage[]) => {
  // Clean up previous chat instance and interval
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  if (chat.value) {
    chat.value.stop();
  }

  // Create transport with conversationId in the body
  const transport = new DefaultChatTransport({
    api: '/api/chat',
    body: () => ({
      conversationId: conversationId.value,
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
      // Refresh conversation list to show updated title/timestamp
      fetchConversations();
    },
    onError: (error) => {
      console.error('[Chat] Error:', error);
      conversationStatus.value = 'error';
    },
  });

  chat.value = newChat;

  // Initial sync
  chatMessages.value = [...newChat.messages];
  chatStatus.value = newChat.status;

  // Set up sync interval to track changes from the Chat class
  // The Chat class uses Vue refs internally, but they're not directly accessible
  // so we poll to sync the state
  syncInterval = setInterval(() => {
    if (chat.value) {
      const currentMessages = chat.value.messages;
      const currentStatus = chat.value.status;

      // Debug logging to diagnose streaming issues
      const lastMsg = currentMessages[currentMessages.length - 1];
      const lastPart = lastMsg?.parts?.[lastMsg.parts.length - 1];
      console.log('[Sync] Status:', currentStatus, 'Msgs:', currentMessages.length,
        'LastPartType:', lastPart?.type,
        'TextLen:', lastPart?.type === 'text' ? (lastPart as { text: string }).text?.length : 'N/A');

      // Always update - let Vue handle the diffing
      // The JSON.stringify comparison was potentially missing incremental updates
      chatMessages.value = [...currentMessages];
      chatStatus.value = currentStatus;
    }
  }, 100); // 100ms is sufficient for smooth updates
};

// Load conversation from server
const loadConversation = async () => {
  loadingChat.value = true;
  chatMessages.value = [];

  const conv = await getConversation(conversationId.value);
  if (conv) {
    conversationStatus.value = conv.status;
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
        fetchConversations();
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

const handleNewChat = async () => {
  const conv = await createConversation();
  router.push(`/chat/${conv.id}`);
};

const handleSelectConversation = (id: string) => {
  if (id !== conversationId.value) {
    if (chat.value) {
      chat.value.stop();
    }
    router.push(`/chat/${id}`);
  }
};

const handleDeleteConversation = async (id: string) => {
  await deleteConversation(id);

  // If deleted current, go to home or another conversation
  if (id === conversationId.value) {
    if (chat.value) {
      chat.value.stop();
    }
    const firstConversation = conversations.value[0];
    if (firstConversation) {
      router.push(`/chat/${firstConversation.id}`);
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

// Cleanup on unmount
onUnmounted(() => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
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
</style>

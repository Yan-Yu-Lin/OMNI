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
      :messages="messages"
      :is-streaming="isStreaming"
      @send="handleSend"
    />
  </LayoutAppLayout>
</template>

<script setup lang="ts">
import { nanoid } from 'nanoid';
import type { UIMessage } from 'ai';
import type { ConversationWithMessages, ConversationStatus } from '~/types';

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
const messages = ref<UIMessage[]>([]);
const conversationStatus = ref<ConversationStatus>('idle');

// Polling interval reference
let pollInterval: ReturnType<typeof setInterval> | undefined;

// Computed streaming state based on conversation status
const isStreaming = computed(() => conversationStatus.value === 'streaming');

// Load conversation from server
const loadConversation = async () => {
  loadingChat.value = true;
  messages.value = [];

  const conv = await getConversation(conversationId.value);
  if (conv) {
    messages.value = conv.messages;
    conversationStatus.value = conv.status;

    // If conversation is still streaming, start polling
    if (conv.status === 'streaming') {
      startPolling();
    }
  } else {
    // Conversation not found, redirect to home
    router.push('/');
    return;
  }

  loadingChat.value = false;
};

// Poll for conversation updates
const pollConversation = async () => {
  try {
    const conv = await getConversation(conversationId.value);
    if (conv) {
      messages.value = conv.messages;
      conversationStatus.value = conv.status;

      // Stop polling when no longer streaming
      if (conv.status !== 'streaming') {
        stopPolling();
        // Refresh conversation list to show updated title/timestamp
        fetchConversations();
      }
    }
  } catch (err) {
    console.error('[Chat] Polling error:', err);
  }
};

// Start polling for updates
const startPolling = () => {
  if (pollInterval) return; // Already polling

  console.log('[Chat] Starting polling for conversation updates');
  pollInterval = setInterval(pollConversation, 2000); // Poll every 2 seconds
};

// Stop polling
const stopPolling = () => {
  if (pollInterval) {
    console.log('[Chat] Stopping polling');
    clearInterval(pollInterval);
    pollInterval = undefined;
  }
};

// Send a message
const handleSend = async (text: string) => {
  // Check if already streaming
  if (conversationStatus.value === 'streaming') {
    console.warn('[Chat] Already streaming, ignoring send request');
    return;
  }

  // Create user message locally for immediate display
  const userMessage: UIMessage = {
    id: nanoid(),
    role: 'user',
    parts: [{ type: 'text', text }],
  };

  // Add to local messages
  const newMessages = [...messages.value, userMessage];
  messages.value = newMessages;

  // Optimistically set to streaming
  conversationStatus.value = 'streaming';

  try {
    // Send to server (fire-and-forget)
    await $fetch('/api/chat', {
      method: 'POST',
      body: {
        conversationId: conversationId.value,
        messages: newMessages,
      },
    });

    // Start polling for AI response
    startPolling();

    // Refresh conversation list to show updated timestamp
    fetchConversations();
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
    stopPolling(); // Stop polling current conversation
    router.push(`/chat/${id}`);
  }
};

const handleDeleteConversation = async (id: string) => {
  await deleteConversation(id);

  // If deleted current, go to home or another conversation
  if (id === conversationId.value) {
    stopPolling();
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
  stopPolling();
});

// Reload when conversation changes (handles navigation between conversations)
watch(conversationId, () => {
  stopPolling();
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

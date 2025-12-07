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
import type { UIMessage } from 'ai';
import type { ConversationWithMessages } from '~/types';

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
  updateConversation,
} = useConversations();

// Chat state
const loadingChat = ref(true);
const initialMessages = ref<UIMessage[]>([]);
const conversationData = ref<ConversationWithMessages | null>(null);

// Track if we've done the initial title update
const hasTitleBeenSet = ref(false);

// Debounce timer for saving messages
let saveTimeout: ReturnType<typeof setTimeout> | undefined;

// Debounced save function
const debouncedSaveMessages = (msgs: UIMessage[]) => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    if (msgs.length > 0 && conversationId.value) {
      saveMessages(conversationId.value, msgs);
    }
  }, 1000); // 1 second debounce
};

// Initialize chat with reactive refs for proper conversation switching
// The composable will watch these refs and recreate the Chat instance when conversationId changes
const { messages, sendMessage, isStreaming, status } = useAppChat({
  conversationId: conversationId,
  initialMessages: initialMessages,
  onMessagesChange: (newMessages) => {
    debouncedSaveMessages(newMessages);

    // Auto-generate title after first exchange (2 messages: user + AI)
    if (newMessages.length === 2 && !hasTitleBeenSet.value) {
      const userMessage = newMessages[0];
      if (userMessage?.parts?.[0]) {
        const firstPart = userMessage.parts[0];
        if (firstPart.type === 'text' && 'text' in firstPart) {
          const text = firstPart.text;
          const title = text.slice(0, 50) + (text.length > 50 ? '...' : '');
          updateConversation(conversationId.value, { title });
          hasTitleBeenSet.value = true;
          // Refresh conversation list to show new title
          fetchConversations();
        }
      }
    }
  },
});

// Load conversation
const loadConversation = async () => {
  loadingChat.value = true;
  hasTitleBeenSet.value = false;

  // Clear initial messages first - this signals to the composable that
  // we're loading new data and need to recreate the Chat instance
  initialMessages.value = [];

  const conv = await getConversation(conversationId.value);
  if (conv) {
    conversationData.value = conv;
    // Update initialMessages ref - the composable will detect this change
    // and recreate the Chat instance with the loaded messages
    initialMessages.value = conv.messages;
    // Check if this conversation already has a non-default title
    if (conv.title !== 'New Conversation') {
      hasTitleBeenSet.value = true;
    }
  } else {
    // Conversation not found, redirect to home
    router.push('/');
    return;
  }

  loadingChat.value = false;
};

const handleSend = (text: string) => {
  sendMessage(text);
};

const handleNewChat = async () => {
  const conv = await createConversation();
  router.push(`/chat/${conv.id}`);
};

const handleSelectConversation = (id: string) => {
  if (id !== conversationId.value) {
    router.push(`/chat/${id}`);
  }
};

const handleDeleteConversation = async (id: string) => {
  await deleteConversation(id);

  // If deleted current, go to home or another conversation
  if (id === conversationId.value) {
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
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
});

// Reload when conversation changes (handles navigation between conversations)
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

<template>
  <div v-if="loadingChat" class="loading-chat">
    Loading conversation...
  </div>

  <ChatContainer
    v-else
    :messages="chatMessages"
    :is-streaming="isStreaming"
    :models="models"
    :selected-model="selectedModelId"
    :provider-preferences="providerPreferences"
    @send="handleSend"
    @update:selected-model="selectedModelId = $event"
    @update:provider-preferences="providerPreferences = $event"
    @model-selected="handleModelSelected"
  />
</template>

<script setup lang="ts">
import { Chat } from '@ai-sdk/vue';
import { DefaultChatTransport, type UIMessage } from 'ai';
import type { ConversationStatus, ProviderPreferences } from '~/types';

const route = useRoute();
const router = useRouter();

const conversationId = computed(() => route.params.id as string);

const { fetchConversations, getConversation, updateConversation, consumePendingMessage } = useConversations();

// Models composable for model selection
const { models, fetchModels } = useModels();

// Settings composable for default model
const { settings, fetchSettings, updateSettings } = useSettings();

// Providers composable
const { markModelSeen } = useProviders();

// Selected model - initialized from settings (will be updated when conversation loads)
const selectedModelId = ref(settings.value.model);
const selectedModelName = computed(() => {
  const model = models.value.find(m => m.id === selectedModelId.value);
  return model?.name || selectedModelId.value;
});

// Provider preferences state
const providerPreferences = ref<ProviderPreferences>({
  mode: 'auto',
  sort: 'throughput',
});

// Chat state
const loadingChat = ref(true);
const conversationStatus = ref<ConversationStatus>('idle');
// Draft mode: conversation doesn't exist in DB yet (lazy creation)
const isDraftConversation = ref(false);

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

  // Create transport with conversationId, model, and provider preferences in the body
  const transport = new DefaultChatTransport({
    api: '/api/chat',
    body: () => ({
      conversationId: conversationId.value,
      model: selectedModelId.value,
      providerPreferences: providerPreferences.value,
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
      // After first message, conversation is created in DB - no longer a draft
      if (isDraftConversation.value) {
        isDraftConversation.value = false;
      }
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

// Handle model selection from ModelSelector
const handleModelSelected = (modelId: string, modelName: string) => {
  // Mark model as seen (for provider auto-open behavior)
  markModelSeen(modelId);
};

// Load conversation from server
const loadConversation = async () => {
  loadingChat.value = true;
  chatMessages.value = [];

  const conv = await getConversation(conversationId.value);
  if (conv) {
    isDraftConversation.value = false;
    conversationStatus.value = conv.status;

    // Use conversation's model if set, otherwise use settings default
    if (conv.model) {
      selectedModelId.value = conv.model;
    } else {
      selectedModelId.value = settings.value.model;
    }

    // Load provider preferences from conversation or settings
    if (conv.providerPreferences) {
      providerPreferences.value = conv.providerPreferences;
    } else if (settings.value.providerPreferences) {
      providerPreferences.value = settings.value.providerPreferences;
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
    // Conversation not found in DB - this is expected for lazy creation
    // Initialize empty chat in "draft" mode; conversation will be created on first message
    console.log('[Chat] Conversation not in DB yet, initializing draft mode');
    isDraftConversation.value = true;
    conversationStatus.value = 'idle';
    selectedModelId.value = settings.value.model;

    // Load provider preferences from settings
    if (settings.value.providerPreferences) {
      providerPreferences.value = settings.value.providerPreferences;
    }

    initializeChat([]);
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

// Watch for model changes and save to both conversation and settings
watch(selectedModelId, async (newModel, oldModel) => {
  // Only save if we have an old value (to avoid initial setup triggers)
  // and the value actually changed
  if (oldModel && newModel !== oldModel) {
    // Save to conversation (per-conversation model) - only if not a draft
    if (!isDraftConversation.value) {
      await updateConversation(conversationId.value, { model: newModel });
    }
    // Save as global default (for new conversations)
    await updateSettings({ model: newModel });
  }
});

// Watch for provider preference changes and save to both conversation and settings
watch(providerPreferences, async (newPrefs, oldPrefs) => {
  // Skip initial value and only save actual changes
  if (oldPrefs && JSON.stringify(newPrefs) !== JSON.stringify(oldPrefs)) {
    // Save to conversation - only if not a draft
    if (!isDraftConversation.value) {
      await updateConversation(conversationId.value, { providerPreferences: newPrefs });
    }
    // Save as global default
    await updateSettings({ providerPreferences: newPrefs });
  }
}, { deep: true });

// Load conversation and models on mount
onMounted(async () => {
  fetchSettings();
  fetchModels();
  await loadConversation();

  // Check for pending message from home page
  const { message: pendingMsg, model: pendingModelId } = consumePendingMessage();
  if (pendingMsg) {
    // If a model was specified with the pending message, use it
    if (pendingModelId) {
      selectedModelId.value = pendingModelId;
    }
    // Send the pending message immediately
    // Use nextTick to ensure chat is fully initialized
    await nextTick();
    handleSend(pendingMsg);
  }
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
</style>

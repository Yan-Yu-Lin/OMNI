<template>
  <div class="chat-page">
    <ChatContainer
      :messages="chatMessages"
      :is-streaming="isStreaming"
      :models="models"
      :selected-model="selectedModelId"
      :provider-preferences="providerPreferences"
      :get-sibling-info="getSiblingInfo"
      @send="handleSend"
      @update:selected-model="selectedModelId = $event"
      @update:provider-preferences="providerPreferences = $event"
      @model-selected="handleModelSelected"
      @edit="handleEdit"
      @regenerate="handleRegenerate"
      @switch-branch="handleSwitchBranch"
    />

    <!-- Edit Message Modal -->
    <Teleport to="body">
      <div v-if="editingMessage" class="edit-modal-overlay" @click.self="cancelEdit">
        <div class="edit-modal">
          <h3 class="edit-modal-title">Edit Message</h3>
          <textarea
            v-model="editText"
            class="edit-textarea"
            rows="6"
            placeholder="Edit your message..."
            @keydown.meta.enter="submitEdit"
            @keydown.ctrl.enter="submitEdit"
          />
          <div class="edit-actions">
            <button class="edit-btn cancel" @click="cancelEdit">Cancel</button>
            <button
              class="edit-btn primary"
              :disabled="!editText.trim()"
              @click="submitEdit"
            >
              Save & Send
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { Chat } from '@ai-sdk/vue';
import { DefaultChatTransport, type UIMessage } from 'ai';
import type { ConversationStatus, ProviderPreferences, BranchMessage } from '~/types';
import { useMessageTree } from '~/composables/useMessageTree';

// Keep page alive to prevent remounting when switching conversations
definePageMeta({
  keepalive: true,
});

const route = useRoute();
const router = useRouter();

const conversationId = computed(() => route.params.id as string);

const { fetchConversations, getConversation, updateConversation } = useConversations();

// Models composable for model selection
const { models, fetchModels } = useModels();

// Settings composable for default model and per-model provider prefs
const { fetchSettings, lastUsed, getModelProviderPrefs, setModelProviderPrefs } = useSettings();

// Helper to convert lastUsed to ProviderPreferences object
function lastUsedToPrefs(lastUsed: { provider: string; providerName?: string }): ProviderPreferences {
  if (lastUsed.provider === 'auto') {
    return { mode: 'auto', sort: 'throughput' };
  }
  // Specific provider - include providerName for display
  return {
    mode: 'specific',
    provider: lastUsed.provider,
    providerName: lastUsed.providerName,
  };
}

// Providers composable
const { markModelSeen } = useProviders();

// Message tree composable for branching support
const { buildTree, getActivePath, getSiblingInfo, switchToBranch, getParentForBranch } = useMessageTree();

// Selected model - initialized from lastUsed (will be updated when conversation loads)
const selectedModelId = ref(lastUsed.value.model);
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
// Flag to skip model watcher during initial load (prevents overwriting loaded provider prefs)
const isInitialLoad = ref(true);

// Pending body params for branching - these are read by the transport body function
// This ensures trigger and parentId are always sent to the server
const pendingParentId = ref<string | undefined>();
const pendingTrigger = ref<'submit' | 'edit' | 'regenerate'>('submit');

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

  // Create transport with conversationId, model, provider preferences, and branching params
  // pendingParentId and pendingTrigger are set before sendMessage calls
  // NOTE: Use 'branchAction' instead of 'trigger' - SDK uses 'trigger' internally
  const transport = new DefaultChatTransport({
    api: '/api/chat',
    body: () => {
      const bodyData = {
        conversationId: conversationId.value,
        model: selectedModelId.value,
        providerPreferences: providerPreferences.value,
        parentId: pendingParentId.value,
        branchAction: pendingTrigger.value,
      };
      console.log('[Transport] Sending body:', bodyData.branchAction, bodyData.parentId);
      return bodyData;
    },
  });

  // Create new Chat instance
  const newChat = new Chat<UIMessage>({
    id: conversationId.value,
    messages: initialMessages,
    transport,
    onFinish: async () => {
      console.log('[Chat] Stream finished');
      conversationStatus.value = 'idle';
      // After first message, conversation is created in DB - no longer a draft
      if (isDraftConversation.value) {
        isDraftConversation.value = false;
      }
      fetchConversations(true, true); // Silent refresh to avoid sidebar flicker
      fetchSettings(true); // Refresh settings to get updated lastUsed

      // Reload and rebuild tree to sync with server state
      // This ensures branch navigation is up-to-date after new messages
      await reloadAndRebuildTree();
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

    // Use conversation's model if set, otherwise use lastUsed
    if (conv.model) {
      selectedModelId.value = conv.model;
    } else {
      selectedModelId.value = lastUsed.value.model;
    }

    // Load provider preferences from conversation or per-model settings
    if (conv.providerPreferences) {
      providerPreferences.value = conv.providerPreferences;
    } else {
      providerPreferences.value = getModelProviderPrefs(selectedModelId.value);
    }

    // Build message tree for branching support
    // conv.messages contains all messages with parentId, conv.activeLeafId is the current branch
    const allMessages = conv.messages as unknown as BranchMessage[];
    const activeLeafId = (conv as { activeLeafId?: string | null }).activeLeafId ?? null;
    buildTree(allMessages, activeLeafId);

    // Use activePath for initial display (or fallback to all messages for old conversations)
    const activePath = (conv as { activePath?: BranchMessage[] }).activePath;
    const initialMessages = (activePath && activePath.length > 0 ? activePath : conv.messages) as unknown as UIMessage[];

    initializeChat(initialMessages);

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

    // Use lastUsed for draft conversations - this is the single source of truth
    selectedModelId.value = lastUsed.value.model;
    providerPreferences.value = lastUsedToPrefs(lastUsed.value);

    // Initialize with empty tree
    buildTree([], null);
    initializeChat([]);
  }

  loadingChat.value = false;
  // Mark initial load as complete - subsequent model changes will load per-model prefs
  isInitialLoad.value = false;
};

// Refresh from DB (fallback)
const refreshFromDB = async () => {
  try {
    const conv = await getConversation(conversationId.value);
    if (conv) {
      // Rebuild message tree
      const allMessages = conv.messages as unknown as BranchMessage[];
      const activeLeafId = (conv as { activeLeafId?: string | null }).activeLeafId ?? null;
      buildTree(allMessages, activeLeafId);

      // Use activePath for display
      const activePath = (conv as { activePath?: BranchMessage[] }).activePath;
      const displayMessages = (activePath && activePath.length > 0 ? activePath : conv.messages) as unknown as UIMessage[];

      // Re-initialize chat with latest messages
      initializeChat(displayMessages);
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

// Reload conversation from DB and rebuild the message tree
// Call this after operations that modify the tree (send, edit, regenerate, switch)
const reloadAndRebuildTree = async () => {
  try {
    const conv = await getConversation(conversationId.value);
    if (!conv) return;

    // Rebuild message tree from all messages
    const allMessages = conv.messages as unknown as BranchMessage[];
    const activeLeafId = (conv as { activeLeafId?: string | null }).activeLeafId ?? null;

    console.log('[Chat] reloadAndRebuildTree - allMessages:', allMessages.length, 'activeLeafId:', activeLeafId);

    buildTree(allMessages, activeLeafId);

    // Get the active path; fall back to all messages if empty (e.g., activeLeafId not yet set)
    let newPath = getActivePath() as unknown as UIMessage[];

    console.log('[Chat] reloadAndRebuildTree - getActivePath returned:', newPath.length, 'messages');

    if (!newPath || newPath.length === 0) {
      console.warn('[Chat] reloadAndRebuildTree - path was empty, using fallback!');
      const convAny = conv as any;
      if (convAny.activePath && Array.isArray(convAny.activePath) && convAny.activePath.length > 0) {
        newPath = convAny.activePath as UIMessage[];
      } else {
        newPath = conv.messages as unknown as UIMessage[];
      }
    }

    console.log('[Chat] reloadAndRebuildTree - final path:', newPath.map(m => `${m.role}:${m.id?.slice(0,8)}`));

    chatMessages.value = newPath;

    // Sync SDK state with new message path
    // IMPORTANT: Must update BOTH the internal messagesRef AND the public state
    // Otherwise the watcher on messagesRef will overwrite chatMessages
    if (chat.value) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyChat = chat.value as any;
      // Update the internal ref first (this is what the watcher observes)
      if (anyChat?.state?.messagesRef) {
        anyChat.state.messagesRef.value = newPath;
      }
      // Then update through official API
      if (typeof anyChat.setMessages === 'function') {
        anyChat.setMessages(newPath);
      } else {
        chat.value.messages = newPath;
      }
    }
  } catch (err) {
    console.error('[Chat] Error reloading tree:', err);
  }
};

// Send a message (with optional parentId and explicit action for branching)
const handleSend = async (text: string, parentId?: string, action?: 'submit' | 'edit' | 'regenerate') => {
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

  // Set pending body params - these are read by the transport body function
  pendingParentId.value = parentId;
  // Use explicit action if provided, otherwise infer from parentId
  pendingTrigger.value = action ?? 'submit';

  try {
    await chat.value.sendMessage({ text });
  } catch (err) {
    console.error('[Chat] Error sending message:', err);
    conversationStatus.value = 'error';
  } finally {
    // Reset pending params after request
    pendingParentId.value = undefined;
    pendingTrigger.value = 'submit';
  }
};

// ============================================================================
// BRANCHING HANDLERS
// ============================================================================

// Edit modal state
const editingMessage = ref<UIMessage | null>(null);
const editText = ref('');

// Handle switching to a different branch
const handleSwitchBranch = async (messageId: string) => {
  try {
    console.log('[Chat] Switching to branch:', messageId);

    // Call API to update active_leaf_id in database
    await switchToBranch(conversationId.value, messageId);

    // Reload and rebuild tree to ensure consistency
    await reloadAndRebuildTree();
  } catch (err) {
    console.error('[Chat] Error switching branch:', err);
  }
};

// Handle edit button click - opens modal
const handleEdit = (message: UIMessage) => {
  editingMessage.value = message;

  // Extract text content from message parts
  const textPart = message.parts?.find(p => p.type === 'text');
  editText.value = (textPart as { type: 'text'; text: string })?.text || '';
};

// Submit edited message - creates a new branch
const submitEdit = async () => {
  if (!editingMessage.value || !editText.value.trim()) return;

  // Store values before clearing
  const messageToEdit = editingMessage.value;
  const newText = editText.value.trim();

  // Get the parent of the message being edited (to create sibling)
  const parentId = getParentForBranch(messageToEdit.id);

  // Close modal
  editingMessage.value = null;
  editText.value = '';

  // Truncate the chat to before the edited message
  // so the new message becomes a sibling of the original
  if (chat.value) {
    const currentMessages = chatMessages.value;
    const editedIndex = currentMessages.findIndex(m => m.id === messageToEdit.id);

    // For first message (index 0), truncate to empty array
    // For other messages, truncate to before the edited message
    const truncatedMessages = editedIndex >= 0 ? currentMessages.slice(0, editedIndex) : currentMessages;

    // Update SDK state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyChat = chat.value as any;
    if (anyChat?.state?.messagesRef) {
      anyChat.state.messagesRef.value = truncatedMessages;
    }
    if (typeof anyChat.setMessages === 'function') {
      anyChat.setMessages(truncatedMessages);
    } else {
      chat.value.messages = truncatedMessages;
    }
    chatMessages.value = truncatedMessages;
  }

  // Send new message with parentId (creates branch)
  // Pass 'edit' explicitly since parentId could be null for root messages
  await handleSend(newText, parentId ?? undefined, 'edit');
};

// Cancel edit - close modal
const cancelEdit = () => {
  editingMessage.value = null;
  editText.value = '';
};

// Handle regenerate - creates a sibling AI response
// Simple approach: remove assistant, resend same user text, let SDK handle normally
const handleRegenerate = async (message: UIMessage) => {
  if (message.role !== 'assistant') return;

  // Get the parent user message
  const parentId = getParentForBranch(message.id);
  if (!parentId) {
    console.error('[Chat] Cannot regenerate: no parent message');
    return;
  }

  // Find the parent user message
  const parentIndex = chatMessages.value.findIndex(m => m.id === parentId);
  if (parentIndex < 0) {
    console.error('[Chat] Cannot find parent message');
    return;
  }

  const parentMessage = chatMessages.value[parentIndex];

  // Extract text from parent user message
  const textPart = parentMessage.parts?.find((p: { type: string }) => p.type === 'text');
  const parentText = (textPart as { type: 'text'; text: string })?.text || '';

  if (!parentText) {
    console.error('[Chat] Parent message has no text');
    return;
  }

  console.log('[Chat] Regenerating - resending user text:', parentText.substring(0, 50));

  // Set array to BEFORE the user message (remove both user and assistant)
  const messagesBeforeUser = chatMessages.value.slice(0, parentIndex);

  // Update SDK state
  if (chat.value) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyChat = chat.value as any;
    if (anyChat?.state?.messagesRef) {
      anyChat.state.messagesRef.value = messagesBeforeUser as unknown as UIMessage[];
    }
    if (typeof anyChat.setMessages === 'function') {
      anyChat.setMessages(messagesBeforeUser as unknown as UIMessage[]);
    } else {
      chat.value.messages = messagesBeforeUser;
    }
    chatMessages.value = messagesBeforeUser;
  }

  // Set pending params - server will save new assistant as sibling
  pendingParentId.value = parentId;
  pendingTrigger.value = 'regenerate';

  conversationStatus.value = 'streaming';

  try {
    // Resend the same user text - SDK handles it normally
    await chat.value?.sendMessage({ text: parentText });
  } catch (err) {
    console.error('[Chat] Error regenerating:', err);
    conversationStatus.value = 'error';
  } finally {
    pendingParentId.value = undefined;
    pendingTrigger.value = 'submit';
  }
};

// Watch for model changes - save to conversation and load per-model provider prefs
watch(selectedModelId, async (newModel, oldModel) => {
  // Only act if we have an old value (to avoid initial setup triggers)
  // and the value actually changed
  if (oldModel && newModel !== oldModel) {
    // Skip during initial load - we'll use the conversation's saved provider prefs
    if (isInitialLoad.value) {
      return;
    }
    // Save to conversation (per-conversation model) - only if not a draft
    if (!isDraftConversation.value) {
      await updateConversation(conversationId.value, { model: newModel });
    }
    // Load provider preferences for the new model
    providerPreferences.value = getModelProviderPrefs(newModel);
    // Note: We don't update global settings here
    // lastUsed is only updated server-side when the FIRST message of a NEW conversation is sent
  }
});

// Watch for provider preference changes - save to conversation and per-model settings
watch(providerPreferences, async (newPrefs, oldPrefs) => {
  // Skip during initial load to avoid overwriting DB with stale data
  if (isInitialLoad.value) {
    return;
  }
  // Skip initial value and only save actual changes
  if (oldPrefs && JSON.stringify(newPrefs) !== JSON.stringify(oldPrefs)) {
    // Save to conversation - only if not a draft
    if (!isDraftConversation.value) {
      await updateConversation(conversationId.value, { providerPreferences: newPrefs });
    }
    // Save to per-model settings (not global)
    await setModelProviderPrefs(selectedModelId.value, newPrefs);
  }
}, { deep: true });

// Load conversation and models on mount
onMounted(async () => {
  await fetchSettings(true); // Force refresh to get latest lastUsed
  fetchModels();
  await loadConversation();
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

  // Clear messages immediately (model will update when fetch completes)
  chatMessages.value = [];

  // Reset initial load flag for the new conversation
  isInitialLoad.value = true;
  loadConversation();
});
</script>

<style scoped>
.chat-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Edit Modal Styles */
.edit-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.edit-modal {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modal-appear 0.2s ease-out;
}

@keyframes modal-appear {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.edit-modal-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 600;
  color: #171717;
}

.edit-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.5;
  color: #171717;
  resize: vertical;
  min-height: 120px;
  transition: border-color 0.2s;
}

.edit-textarea:focus {
  outline: none;
  border-color: #171717;
}

.edit-textarea::placeholder {
  color: #a0a0a0;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.edit-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn.cancel {
  background: transparent;
  border: 1px solid #e0e0e0;
  color: #666;
}

.edit-btn.cancel:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.edit-btn.primary {
  background: #171717;
  border: 1px solid #171717;
  color: #fff;
}

.edit-btn.primary:hover:not(:disabled) {
  background: #333;
}

.edit-btn.primary:disabled {
  background: #e0e0e0;
  border-color: #e0e0e0;
  color: #a0a0a0;
  cursor: not-allowed;
}
</style>

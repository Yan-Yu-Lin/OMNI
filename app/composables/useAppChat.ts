import { Chat } from '@ai-sdk/vue';
import { DefaultChatTransport, type UIMessage } from 'ai';
import type { ChatStatus } from 'ai';
import type { Ref, WatchStopHandle } from 'vue';

interface UseAppChatOptions {
  conversationId: Ref<string>;
  initialMessages: Ref<UIMessage[]>;
  onMessagesChange?: (messages: UIMessage[]) => void;
}

export function useAppChat(options: UseAppChatOptions) {
  // Create reactive refs for SSR compatibility
  // These will be populated with actual values on the client
  const messages = ref<UIMessage[]>([]) as Ref<UIMessage[]>;
  const status = ref<ChatStatus>('ready') as Ref<ChatStatus>;
  const error = ref<Error | undefined>(undefined) as Ref<Error | undefined>;

  // Store chat instance in a ref so it persists and can be accessed by sendMessage/stop
  const chatRef = ref<Chat<UIMessage> | null>(null);

  // Track watchers so we can clean them up when recreating the chat
  let watchStopHandles: WatchStopHandle[] = [];

  // Computed helpers for status
  const isStreaming = computed(() => {
    return status.value === 'streaming' || status.value === 'submitted';
  });

  const isReady = computed(() => {
    return status.value === 'ready';
  });

  const hasError = computed(() => {
    return status.value === 'error';
  });

  // Function to create/recreate the Chat instance
  const createChatInstance = (conversationId: string, initialMsgs: UIMessage[]) => {
    // Clean up existing watchers
    watchStopHandles.forEach(stop => stop());
    watchStopHandles = [];

    // Create the chat instance
    const chat = new Chat({
      id: conversationId,
      messages: initialMsgs,
      transport: new DefaultChatTransport({
        api: '/api/chat',
      }),
    });

    chatRef.value = chat;

    // Access the internal VueChatState refs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chatState = (chat as any).state;

    // Get the internal refs
    const internalMessages = chatState.messagesRef as Ref<UIMessage[]>;
    const internalStatus = chatState.statusRef as Ref<ChatStatus>;
    const internalError = chatState.errorRef as Ref<Error | undefined>;

    // Watch the internal refs and sync to our exported refs
    // This maintains reactivity when the Chat class updates its state
    const stopMessages = watch(internalMessages, (newMessages) => {
      messages.value = [...newMessages];
      // Notify parent of message changes for persistence
      if (options.onMessagesChange) {
        options.onMessagesChange(newMessages);
      }
    }, { immediate: true, deep: true });

    const stopStatus = watch(internalStatus, (newStatus) => {
      status.value = newStatus;
    }, { immediate: true });

    const stopError = watch(internalError, (newError) => {
      error.value = newError;
    }, { immediate: true });

    watchStopHandles = [stopMessages, stopStatus, stopError];
  };

  // Track which conversation ID the current Chat instance was created for
  // This helps distinguish between:
  // - Initial load (Chat created with empty messages, then DB data arrives)
  // - Conversation switch (Chat needs recreation with new conversation's messages)
  // - Streaming (messages change but shouldn't trigger recreation)
  const initializedForConversationId = ref<string | null>(null);

  // Initialize the Chat class only on the client side after hydration
  // This prevents SSR hydration mismatches and ensures the Chat instance
  // is created with the browser's fetch API
  onMounted(() => {
    // Create initial chat instance with current values
    const currentId = options.conversationId.value;
    const currentMessages = options.initialMessages.value;

    // Only mark as fully initialized if we have messages
    // Otherwise, we need to wait for loadConversation() to complete
    if (currentMessages.length > 0) {
      initializedForConversationId.value = currentId;
    }
    createChatInstance(currentId, currentMessages);

    // Watch for conversation ID changes - this handles navigation between conversations
    // When ID changes, we DON'T immediately recreate because initialMessages still has OLD data
    // Instead, we reset the initialization tracking and wait for initialMessages to update
    watch(
      options.conversationId,
      (newConversationId, oldConversationId) => {
        if (newConversationId !== oldConversationId) {
          // Reset - we haven't loaded messages for this new conversation yet
          // The initialMessages watcher will trigger recreation when data arrives
          initializedForConversationId.value = null;

          // If initialMessages already has messages for the new conversation
          // (edge case: data loaded before ID change registered), create now
          if (options.initialMessages.value.length > 0) {
            initializedForConversationId.value = newConversationId;
            createChatInstance(newConversationId, options.initialMessages.value);
          } else {
            // Create with empty messages - will be recreated when data loads
            createChatInstance(newConversationId, []);
          }
        }
      }
    );

    // Watch for initialMessages changes - handles async data loading
    // Key scenarios:
    // 1. Initial page load: Chat created empty, then DB data arrives -> recreate
    // 2. Conversation switch: ID changes, then new messages arrive -> recreate
    // 3. Streaming: Messages update during chat -> DON'T recreate
    watch(
      options.initialMessages,
      (newInitialMessages, oldInitialMessages) => {
        const currentConvId = options.conversationId.value;

        // Only recreate if we haven't initialized for this conversation yet
        // AND messages have genuinely changed (not just streaming updates)
        const needsInitialization = initializedForConversationId.value !== currentConvId;
        const hasNewMessages = newInitialMessages.length > 0;

        // Check if this is a genuine reload (messages from DB, not streaming)
        // During streaming, messages grow incrementally. DB loads replace entirely.
        const isDbLoad = oldInitialMessages.length === 0 ||
          (newInitialMessages.length > 0 &&
           newInitialMessages[0]?.id !== oldInitialMessages[0]?.id);

        if (needsInitialization && hasNewMessages && isDbLoad) {
          initializedForConversationId.value = currentConvId;
          createChatInstance(currentConvId, newInitialMessages);
        }
      },
      { deep: true }
    );
  });

  // Cleanup on unmount
  onUnmounted(() => {
    watchStopHandles.forEach(stop => stop());
    watchStopHandles = [];
  });

  // Send message helper
  const sendMessage = (text: string) => {
    if (chatRef.value) {
      chatRef.value.sendMessage({ text });
    }
  };

  // Stop helper
  const stop = () => {
    if (chatRef.value) {
      chatRef.value.stop();
    }
  };

  // Set messages helper (useful for resetting or loading messages)
  const setMessages = (newMessages: UIMessage[]) => {
    messages.value = [...newMessages];
    // Note: The Chat class doesn't expose a setMessages method in Vue
    // If needed, we would need to recreate the chat instance
  };

  return {
    // Reactive state - these refs are synced with the Chat's internal state
    messages,
    status,
    error,

    // Computed helpers
    isStreaming,
    isReady,
    hasError,

    // Actions
    sendMessage,
    stop,
    setMessages,
  };
}

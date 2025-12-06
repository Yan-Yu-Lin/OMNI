import { Chat } from '@ai-sdk/vue';
import { DefaultChatTransport, type UIMessage } from 'ai';
import type { ChatStatus } from 'ai';
import type { Ref } from 'vue';

interface UseAppChatOptions {
  conversationId?: string;
  initialMessages?: UIMessage[];
}

export function useAppChat(options: UseAppChatOptions = {}) {
  // Create reactive refs for SSR compatibility
  // These will be populated with actual values on the client
  const messages = ref<UIMessage[]>(options.initialMessages ?? []) as Ref<UIMessage[]>;
  const status = ref<ChatStatus>('ready') as Ref<ChatStatus>;
  const error = ref<Error | undefined>(undefined) as Ref<Error | undefined>;

  // Store chat instance in a ref so it persists and can be accessed by sendMessage/stop
  const chatRef = ref<Chat<UIMessage> | null>(null);

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

  // Initialize the Chat class only on the client side after hydration
  // This prevents SSR hydration mismatches and ensures the Chat instance
  // is created with the browser's fetch API
  onMounted(() => {
    // Create the chat instance
    const chat = new Chat({
      id: options.conversationId,
      messages: options.initialMessages,
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
    watch(internalMessages, (newMessages) => {
      messages.value = [...newMessages];
    }, { immediate: true, deep: true });

    watch(internalStatus, (newStatus) => {
      status.value = newStatus;
    }, { immediate: true });

    watch(internalError, (newError) => {
      error.value = newError;
    }, { immediate: true });
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
  };
}

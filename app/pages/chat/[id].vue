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
const messages = ref<UIMessage[]>([]);
const conversationStatus = ref<ConversationStatus>('idle');

// SSE connection reference
let eventSource: EventSource | null = null;

// Reference to the currently streaming assistant message
let streamingAssistantMessage: UIMessage | null = null;

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

    // If conversation is still streaming, connect to SSE
    if (conv.status === 'streaming') {
      connectToSSE();
    }
  } else {
    // Conversation not found, redirect to home
    router.push('/');
    return;
  }

  loadingChat.value = false;
};

// Connect to SSE for real-time streaming
const connectToSSE = () => {
  // Close existing connection if any
  disconnectSSE();

  console.log('[Chat] Connecting to SSE stream:', conversationId.value);

  eventSource = new EventSource(`/api/chat/stream/${conversationId.value}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleSSEEvent(data);
    } catch (err) {
      console.error('[Chat] Error parsing SSE event:', err);
    }
  };

  eventSource.onerror = (err) => {
    console.error('[Chat] SSE error:', err);
    disconnectSSE();

    // If still marked as streaming, try to recover by fetching from DB
    if (conversationStatus.value === 'streaming') {
      console.log('[Chat] SSE disconnected while streaming, fetching from DB...');
      refreshFromDB();
    }
  };
};

// Handle SSE events
const handleSSEEvent = (data: {
  type: string;
  content?: string;
  toolName?: string;
  toolCallId?: string;
  args?: unknown;
  result?: unknown;
  error?: string;
}) => {
  switch (data.type) {
    case 'connected':
      console.log('[Chat] SSE connected');
      break;

    case 'text-delta':
      // Append text to the streaming assistant message
      if (data.content) {
        appendToAssistantMessage(data.content);
      }
      break;

    case 'tool-call':
      // Add tool call part to assistant message
      if (data.toolName && data.toolCallId) {
        addToolCallPart(data.toolName, data.toolCallId, data.args);
      }
      break;

    case 'tool-result':
      // Update tool part with result
      if (data.toolCallId) {
        updateToolResult(data.toolCallId, data.result);
      }
      break;

    case 'complete':
      console.log('[Chat] Stream complete');
      conversationStatus.value = 'idle';
      streamingAssistantMessage = null;
      disconnectSSE();
      // Refresh from DB to get final structured message
      refreshFromDB();
      break;

    case 'error':
      console.error('[Chat] Stream error:', data.error);
      conversationStatus.value = 'error';
      streamingAssistantMessage = null;
      disconnectSSE();
      break;
  }
};

// Append text to the current streaming assistant message
const appendToAssistantMessage = (text: string) => {
  if (!streamingAssistantMessage) {
    // Create new assistant message if none exists
    streamingAssistantMessage = {
      id: nanoid(),
      role: 'assistant',
      parts: [{ type: 'text', text: '' }],
    };
    messages.value = [...messages.value, streamingAssistantMessage];
  }

  // Find the text part and append
  const textPart = streamingAssistantMessage.parts?.find(p => p.type === 'text');
  if (textPart && 'text' in textPart) {
    textPart.text += text;
    // Trigger reactivity
    messages.value = [...messages.value];
  }
};

// Add a tool call part to the assistant message
const addToolCallPart = (toolName: string, toolCallId: string, args: unknown) => {
  if (!streamingAssistantMessage) {
    streamingAssistantMessage = {
      id: nanoid(),
      role: 'assistant',
      parts: [],
    };
    messages.value = [...messages.value, streamingAssistantMessage];
  }

  // Add tool-invocation part
  streamingAssistantMessage.parts = [
    ...(streamingAssistantMessage.parts || []),
    {
      type: 'tool-invocation',
      toolInvocation: {
        toolCallId,
        toolName,
        args,
        state: 'call',
      },
    } as UIMessage['parts'][0],
  ];

  // Trigger reactivity
  messages.value = [...messages.value];
};

// Update tool part with result
const updateToolResult = (toolCallId: string, result: unknown) => {
  if (!streamingAssistantMessage) return;

  // Find the tool part and update it
  const toolPart = streamingAssistantMessage.parts?.find(
    (p) => p.type === 'tool-invocation' &&
           'toolInvocation' in p &&
           p.toolInvocation.toolCallId === toolCallId
  );

  if (toolPart && 'toolInvocation' in toolPart) {
    toolPart.toolInvocation.state = 'result';
    toolPart.toolInvocation.result = result;
    // Trigger reactivity
    messages.value = [...messages.value];
  }
};

// Disconnect SSE
const disconnectSSE = () => {
  if (eventSource) {
    console.log('[Chat] Disconnecting SSE');
    eventSource.close();
    eventSource = null;
  }
};

// Refresh from DB (fallback)
const refreshFromDB = async () => {
  try {
    const conv = await getConversation(conversationId.value);
    if (conv) {
      messages.value = conv.messages;
      conversationStatus.value = conv.status;

      // If still streaming, reconnect to SSE
      if (conv.status === 'streaming') {
        connectToSSE();
      } else {
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

  // Reset streaming assistant message
  streamingAssistantMessage = null;

  try {
    // Send to server (fire-and-forget)
    await $fetch('/api/chat', {
      method: 'POST',
      body: {
        conversationId: conversationId.value,
        messages: newMessages,
      },
    });

    // Connect to SSE for real-time streaming
    connectToSSE();

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
    disconnectSSE(); // Disconnect from current stream
    router.push(`/chat/${id}`);
  }
};

const handleDeleteConversation = async (id: string) => {
  await deleteConversation(id);

  // If deleted current, go to home or another conversation
  if (id === conversationId.value) {
    disconnectSSE();
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
  disconnectSSE();
});

// Reload when conversation changes (handles navigation between conversations)
watch(conversationId, () => {
  disconnectSSE();
  streamingAssistantMessage = null;
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

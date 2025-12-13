<template>
  <div ref="containerRef" class="message-list">
    <template v-if="messages.length === 0">
      <ChatWelcomeSection @suggestion-click="$emit('suggestion-click', $event)" />
    </template>
    <template v-else>
      <ChatMessage
        v-for="(message, index) in messages"
        :key="message.id"
        :message="message"
        :is-streaming="isStreaming && isLastAssistantMessage(index)"
      />
    </template>

    <div v-if="isStreaming && showPendingIndicator" class="streaming-indicator">
      <div class="typing-dots">
        <span class="dot" />
        <span class="dot" />
        <span class="dot" />
      </div>
      <span class="typing-text">AI is thinking...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UIMessage } from 'ai';

const props = defineProps<{
  messages: UIMessage[];
  isStreaming?: boolean;
}>();

defineEmits<{
  'suggestion-click': [suggestion: string];
}>();

const containerRef = ref<HTMLElement>();

// Check if last message is from assistant
const lastMessage = computed(() => props.messages[props.messages.length - 1]);

const isLastAssistantMessage = (index: number): boolean => {
  return (
    index === props.messages.length - 1 &&
    props.messages[index]?.role === 'assistant'
  );
};

// Show pending indicator when streaming but assistant hasn't started responding
const showPendingIndicator = computed(() => {
  if (!props.isStreaming) return false;
  if (!lastMessage.value) return true;
  // Show if last message is from user (waiting for assistant)
  return lastMessage.value.role === 'user';
});

// Auto-scroll to bottom when messages change
const scrollToBottom = () => {
  nextTick(() => {
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight;
    }
  });
};

watch(
  () => props.messages.length,
  () => scrollToBottom()
);

// Also scroll when streaming content updates
watch(
  () => lastMessage.value?.parts?.length,
  () => {
    if (props.isStreaming) {
      scrollToBottom();
    }
  }
);

// Scroll on last message text content change (for streaming)
watch(
  () => {
    const last = lastMessage.value;
    if (!last?.parts) return '';
    const textParts = last.parts.filter((p) => p.type === 'text');
    return textParts.map((p) => (p as { text: string }).text).join('');
  },
  () => {
    if (props.isStreaming) {
      scrollToBottom();
    }
  }
);
</script>

<style scoped>
.message-list {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding-bottom: 140px; /* Space for floating input */
}

.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 32px 24px;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.dot {
  width: 8px;
  height: 8px;
  background: #171717;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

.dot:nth-child(3) {
  animation-delay: 0s;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.typing-text {
  font-size: 13px;
  color: #666;
}
</style>

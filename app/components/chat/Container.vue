<template>
  <div class="chat-container">
    <ChatMessageList :messages="messages" :is-streaming="isStreaming" />
    <ChatInput
      :disabled="isStreaming"
      :placeholder="inputPlaceholder"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import type { UIMessage } from 'ai';

const props = defineProps<{
  messages: UIMessage[];
  isStreaming?: boolean;
}>();

const emit = defineEmits<{
  send: [text: string];
}>();

const inputPlaceholder = computed(() => {
  if (props.isStreaming) {
    return 'Wait for the response...';
  }
  return 'Send a message...';
});

const handleSubmit = (text: string) => {
  emit('send', text);
};
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}
</style>

<template>
  <LayoutAppLayout>
    <template #sidebar>
      <LayoutSidebar @new-chat="handleNewChat">
        <p style="padding: 16px; color: #666; font-size: 14px">
          No conversations yet
        </p>
      </LayoutSidebar>
    </template>

    <ChatContainer
      :messages="messages"
      :is-streaming="isStreaming"
      @send="handleSend"
    />
  </LayoutAppLayout>
</template>

<script setup lang="ts">
const { messages, sendMessage, isStreaming } = useAppChat();

const handleSend = (text: string) => {
  sendMessage(text);
};

const handleNewChat = () => {
  // Refresh the page to start new chat
  // Proper implementation in Phase 5
  window.location.reload();
};
</script>

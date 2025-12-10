<template>
  <div class="home-content">
    <div class="welcome">
      <h1>AI Chat</h1>
      <p>Start a new conversation or select one from the sidebar.</p>
      <button class="start-btn" @click="handleNewChat">
        New Conversation
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter();
const { createConversation } = useConversations();
const { settings } = useSettings();

const handleNewChat = async () => {
  const conv = await createConversation({ model: settings.value.model });
  router.push(`/chat/${conv.id}`);
};
</script>

<style scoped>
.home-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.welcome {
  text-align: center;
}

.welcome h1 {
  font-size: 32px;
  margin-bottom: 8px;
}

.welcome p {
  color: #666;
  margin-bottom: 24px;
}

.start-btn {
  padding: 12px 24px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.start-btn:hover {
  background: #333;
}
</style>

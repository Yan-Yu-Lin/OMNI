<template>
  <div class="sidebar-container">
    <div class="sidebar-header">
      <button class="new-chat-btn" @click="$emit('new-chat')">
        + New Chat
      </button>
    </div>

    <div class="sidebar-content">
      <slot />
    </div>

    <div class="sidebar-footer">
      <NuxtLink to="/settings" class="settings-link">
        Settings
      </NuxtLink>
      <NuxtLink to="/models" class="settings-link">
        Models
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  'new-chat': [];
}>();
</script>

<style scoped>
.sidebar-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.new-chat-btn {
  width: 100%;
  padding: 10px 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.new-chat-btn:hover {
  background: #333;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-link {
  color: #666;
  text-decoration: none;
  font-size: 14px;
  padding: 8px;
  border-radius: 4px;
}

.settings-link:hover {
  background: #e0e0e0;
}
</style>

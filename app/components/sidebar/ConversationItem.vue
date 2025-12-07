<template>
  <div
    class="conversation-item"
    :class="{ active: isActive }"
    @click="$emit('select')"
  >
    <div class="conversation-title">{{ conversation.title }}</div>
    <div class="conversation-meta">
      {{ formatDate(conversation.updatedAt) }}
    </div>

    <button
      class="delete-btn"
      @click.stop="$emit('delete')"
      title="Delete conversation"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Conversation } from '~/types';

defineProps<{
  conversation: Conversation;
  isActive?: boolean;
}>();

defineEmits<{
  select: [];
  delete: [];
}>();

const formatDate = (dateStr: string | Date) => {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Today
  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // This week
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  // Older
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};
</script>

<style scoped>
.conversation-item {
  position: relative;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s;
}

.conversation-item:hover {
  background: #e8e8e8;
}

.conversation-item.active {
  background: #e0e0e0;
}

.conversation-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 24px;
}

.conversation-meta {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.delete-btn {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #999;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.1s;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.conversation-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #ddd;
  color: #666;
}
</style>

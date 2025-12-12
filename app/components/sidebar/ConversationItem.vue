<template>
  <div
    class="conversation-item"
    :class="{ active: isActive, pinned: conversation.pinned }"
    @click="$emit('select')"
  >
    <div class="conversation-title">{{ conversation.title }}</div>

    <div class="action-buttons">
      <button
        class="action-btn pin-btn"
        :class="{ 'is-pinned': conversation.pinned }"
        @click.stop="$emit('pin')"
        :title="conversation.pinned ? 'Unpin conversation' : 'Pin conversation'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="17" x2="12" y2="22"></line>
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
        </svg>
      </button>
      <button
        class="action-btn delete-btn"
        @click.stop="$emit('delete')"
        title="Delete conversation"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
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
  pin: [];
}>();
</script>

<style scoped>
.conversation-item {
  position: relative;
  padding: 8px 12px;
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
  padding-right: 56px;
}

.action-buttons {
  position: absolute;
  top: 50%;
  right: 4px;
  transform: translateY(-50%);
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.1s;
}

.conversation-item:hover .action-buttons {
  opacity: 1;
}

/* Always show pin button if item is pinned */
.conversation-item.pinned .pin-btn {
  opacity: 1;
}

.conversation-item.pinned:not(:hover) .action-buttons {
  opacity: 1;
}

.conversation-item.pinned:not(:hover) .delete-btn {
  display: none;
}

.action-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #999;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: #ddd;
  color: #666;
}

.pin-btn.is-pinned {
  color: #666;
}

.pin-btn.is-pinned:hover {
  color: #333;
}
</style>

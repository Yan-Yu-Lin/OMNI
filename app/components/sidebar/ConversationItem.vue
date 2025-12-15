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
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background 0.15s ease,
    box-shadow 0.15s ease;
}

.conversation-item:hover {
  background: var(--sidebar-hover);
}

.conversation-item.active {
  background: var(--sidebar-active-bg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

/* Subtle left accent for active item */
.conversation-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 16px;
  background: var(--sidebar-active-accent);
  border-radius: 0 2px 2px 0;
}

.conversation-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--sidebar-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 56px;
}

.action-buttons {
  position: absolute;
  top: 50%;
  right: 6px;
  transform: translateY(-50%) translateX(10px);
  display: flex;
  gap: 2px;
  opacity: 0;
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.conversation-item:hover .action-buttons {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.action-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--sidebar-text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  color: var(--sidebar-text);
}

.pin-btn.is-pinned {
  color: var(--color-error);
}

.pin-btn.is-pinned:hover {
  color: var(--color-error);
}
</style>

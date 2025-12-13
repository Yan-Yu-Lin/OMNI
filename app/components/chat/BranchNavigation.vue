<template>
  <div v-if="siblingInfo && siblingInfo.total > 1" class="branch-nav">
    <button
      class="nav-btn"
      :disabled="siblingInfo.currentIndex <= 1"
      @click="goToPrev"
      aria-label="Previous version"
    >
      <Icon name="lucide:chevron-left" class="w-3.5 h-3.5" />
    </button>
    <span class="nav-info">{{ siblingInfo.currentIndex }}/{{ siblingInfo.total }}</span>
    <button
      class="nav-btn"
      :disabled="siblingInfo.currentIndex >= siblingInfo.total"
      @click="goToNext"
      aria-label="Next version"
    >
      <Icon name="lucide:chevron-right" class="w-3.5 h-3.5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { SiblingInfo } from '~/types';

const props = defineProps<{
  siblingInfo: SiblingInfo | null;
}>();

const emit = defineEmits<{
  'switch-branch': [messageId: string];
}>();

function goToPrev() {
  if (!props.siblingInfo || props.siblingInfo.currentIndex <= 1) return;
  const prevIndex = props.siblingInfo.currentIndex - 2; // Convert to 0-indexed
  const prevId = props.siblingInfo.siblingIds[prevIndex];
  if (prevId) emit('switch-branch', prevId);
}

function goToNext() {
  if (!props.siblingInfo || props.siblingInfo.currentIndex >= props.siblingInfo.total) return;
  const nextIndex = props.siblingInfo.currentIndex; // Already 0-indexed for next
  const nextId = props.siblingInfo.siblingIds[nextIndex];
  if (nextId) emit('switch-branch', nextId);
}
</script>

<style scoped>
.branch-nav {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #999;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.125rem;
  border-radius: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: inherit;
  transition: background-color 0.15s ease, opacity 0.15s ease;
}

.nav-btn:hover:not(:disabled) {
  background-color: #f0f0f0;
  color: #666;
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.nav-info {
  min-width: 2rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
</style>

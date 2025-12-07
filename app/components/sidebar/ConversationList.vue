<template>
  <div class="conversation-list">
    <div v-if="loading" class="loading">Loading...</div>

    <div v-else-if="conversations.length === 0" class="empty">
      No conversations yet
    </div>

    <template v-else>
      <SidebarConversationItem
        v-for="conv in conversations"
        :key="conv.id"
        :conversation="conv"
        :is-active="conv.id === activeId"
        @select="$emit('select', conv.id)"
        @delete="$emit('delete', conv.id)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Conversation } from '~/types';

defineProps<{
  conversations: Conversation[];
  activeId?: string;
  loading?: boolean;
}>();

defineEmits<{
  select: [id: string];
  delete: [id: string];
}>();
</script>

<style scoped>
.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.loading,
.empty {
  padding: 16px;
  text-align: center;
  color: #666;
  font-size: 14px;
}
</style>

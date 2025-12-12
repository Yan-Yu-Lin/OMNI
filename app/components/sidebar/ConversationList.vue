<template>
  <div class="conversation-list">
    <div v-if="loading" class="loading">Loading...</div>

    <div v-else-if="conversations.length === 0" class="empty">
      No conversations yet
    </div>

    <template v-else>
      <!-- Pinned Section -->
      <template v-if="groupedConversations.pinned.length > 0">
        <div class="section-header">Pinned</div>
        <SidebarConversationItem
          v-for="conv in groupedConversations.pinned"
          :key="conv.id"
          :conversation="conv"
          :is-active="conv.id === activeId"
          @select="$emit('select', conv.id)"
          @delete="$emit('delete', conv.id)"
          @pin="$emit('pin', conv.id)"
        />
      </template>

      <!-- Today Section -->
      <template v-if="groupedConversations.today.length > 0">
        <div class="section-header">Today</div>
        <SidebarConversationItem
          v-for="conv in groupedConversations.today"
          :key="conv.id"
          :conversation="conv"
          :is-active="conv.id === activeId"
          @select="$emit('select', conv.id)"
          @delete="$emit('delete', conv.id)"
          @pin="$emit('pin', conv.id)"
        />
      </template>

      <!-- Yesterday Section -->
      <template v-if="groupedConversations.yesterday.length > 0">
        <div class="section-header">Yesterday</div>
        <SidebarConversationItem
          v-for="conv in groupedConversations.yesterday"
          :key="conv.id"
          :conversation="conv"
          :is-active="conv.id === activeId"
          @select="$emit('select', conv.id)"
          @delete="$emit('delete', conv.id)"
          @pin="$emit('pin', conv.id)"
        />
      </template>

      <!-- Last 7 Days Section -->
      <template v-if="groupedConversations.last7Days.length > 0">
        <div class="section-header">Last 7 Days</div>
        <SidebarConversationItem
          v-for="conv in groupedConversations.last7Days"
          :key="conv.id"
          :conversation="conv"
          :is-active="conv.id === activeId"
          @select="$emit('select', conv.id)"
          @delete="$emit('delete', conv.id)"
          @pin="$emit('pin', conv.id)"
        />
      </template>

      <!-- Last 30 Days Section -->
      <template v-if="groupedConversations.last30Days.length > 0">
        <div class="section-header">Last 30 Days</div>
        <SidebarConversationItem
          v-for="conv in groupedConversations.last30Days"
          :key="conv.id"
          :conversation="conv"
          :is-active="conv.id === activeId"
          @select="$emit('select', conv.id)"
          @delete="$emit('delete', conv.id)"
          @pin="$emit('pin', conv.id)"
        />
      </template>

      <!-- Older Section -->
      <template v-if="groupedConversations.older.length > 0">
        <div class="section-header">Older</div>
        <SidebarConversationItem
          v-for="conv in groupedConversations.older"
          :key="conv.id"
          :conversation="conv"
          :is-active="conv.id === activeId"
          @select="$emit('select', conv.id)"
          @delete="$emit('delete', conv.id)"
          @pin="$emit('pin', conv.id)"
        />
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Conversation } from '~/types';

const props = defineProps<{
  conversations: Conversation[];
  activeId?: string;
  loading?: boolean;
}>();

defineEmits<{
  select: [id: string];
  delete: [id: string];
  pin: [id: string];
}>();

interface GroupedConversations {
  pinned: Conversation[];
  today: Conversation[];
  yesterday: Conversation[];
  last7Days: Conversation[];
  last30Days: Conversation[];
  older: Conversation[];
}

const groupedConversations = computed<GroupedConversations>(() => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOf7DaysAgo = new Date(startOfToday);
  startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 7);
  const startOf30DaysAgo = new Date(startOfToday);
  startOf30DaysAgo.setDate(startOf30DaysAgo.getDate() - 30);

  const groups: GroupedConversations = {
    pinned: [],
    today: [],
    yesterday: [],
    last7Days: [],
    last30Days: [],
    older: [],
  };

  for (const conv of props.conversations) {
    // Pinned conversations go to pinned section
    if (conv.pinned) {
      groups.pinned.push(conv);
      continue;
    }

    const date = new Date(conv.updatedAt);

    if (date >= startOfToday) {
      groups.today.push(conv);
    } else if (date >= startOfYesterday) {
      groups.yesterday.push(conv);
    } else if (date >= startOf7DaysAgo) {
      groups.last7Days.push(conv);
    } else if (date >= startOf30DaysAgo) {
      groups.last30Days.push(conv);
    } else {
      groups.older.push(conv);
    }
  }

  return groups;
});
</script>

<style scoped>
.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-header {
  font-size: 11px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 12px 12px 4px;
  margin-top: 4px;
}

.section-header:first-child {
  margin-top: 0;
}

.loading,
.empty {
  padding: 16px;
  text-align: center;
  color: #666;
  font-size: 14px;
}
</style>

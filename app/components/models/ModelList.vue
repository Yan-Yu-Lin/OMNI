<template>
  <div class="model-list">
    <!-- Loading state -->
    <div v-if="loading" class="state-message">
      <div class="loading-spinner"></div>
      <span>Loading models...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="state-message error">
      <span>{{ error }}</span>
      <button class="retry-btn" @click="$emit('retry')">Try Again</button>
    </div>

    <!-- Empty state -->
    <div v-else-if="Object.keys(groupedModels).length === 0" class="state-message">
      <span>No models match your filters</span>
      <button class="reset-btn" @click="$emit('reset-filters')">Reset Filters</button>
    </div>

    <!-- Model grid grouped by provider -->
    <div v-else class="providers-list">
      <div
        v-for="(models, provider) in groupedModels"
        :key="provider"
        class="provider-group"
      >
        <h2 class="provider-name">
          {{ getProviderDisplayName(provider) }}
          <span class="provider-count">({{ models.length }})</span>
        </h2>
        <div class="models-grid">
          <ModelsModelCard
            v-for="model in models"
            :key="model.id"
            :model="model"
            :is-selected="model.id === selectedModelId"
            :is-pinned="isPinned(model.id)"
            @select="$emit('select', model.id)"
            @toggle-pin="$emit('toggle-pin', model.id)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Model } from '~/types';
import { getProviderDisplayName } from '~/utils/providers';

const props = defineProps<{
  groupedModels: Record<string, Model[]>;
  selectedModelId?: string;
  loading: boolean;
  error: string | null;
  pinnedModels?: string[];
}>();

defineEmits<{
  select: [modelId: string];
  retry: [];
  'reset-filters': [];
  'toggle-pin': [modelId: string];
}>();

function isPinned(modelId: string): boolean {
  return props.pinnedModels?.includes(modelId) ?? false;
}
</script>

<style scoped>
.model-list {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.state-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px;
  color: #666;
}

.state-message.error {
  color: #c62828;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e0e0e0;
  border-top-color: #171717;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.retry-btn,
.reset-btn {
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
}

.retry-btn:hover,
.reset-btn:hover {
  background: #f5f5f5;
}

.providers-list {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.provider-group {
  /* Empty - just for structure */
}

.provider-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.provider-count {
  font-size: 14px;
  font-weight: 400;
  color: #666;
}

.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
</style>

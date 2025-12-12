<template>
  <div class="chat-container">
    <ChatMessageList :messages="messages" :is-streaming="isStreaming" />
    <div class="input-section">
      <div v-if="models.length > 0" class="model-row">
        <ModelsModelSelector
          :model-value="selectedModel"
          :models="models"
          @update:model-value="handleModelChange"
          @model-selected="handleModelSelected"
        />
        <button
          v-if="selectedModel && showProviderButton"
          class="provider-toggle"
          @click="emit('provider-click')"
          :title="providerDisplayText"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span class="provider-label">{{ providerDisplayText }}</span>
        </button>
      </div>
      <ChatInput
        :disabled="isStreaming"
        :placeholder="inputPlaceholder"
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UIMessage } from 'ai';
import type { Model } from '~/types';

const props = withDefaults(defineProps<{
  messages: UIMessage[];
  isStreaming?: boolean;
  models?: Model[];
  selectedModel?: string;
  showProviderButton?: boolean;
  providerDisplayText?: string;
}>(), {
  isStreaming: false,
  models: () => [],
  selectedModel: '',
  showProviderButton: false,
  providerDisplayText: 'Auto',
});

const emit = defineEmits<{
  send: [text: string];
  'update:selectedModel': [modelId: string];
  'model-selected': [modelId: string, modelName: string];
  'provider-click': [];
}>();

const inputPlaceholder = computed(() => {
  if (props.isStreaming) {
    return 'Wait for the response...';
  }
  return 'Send a message...';
});

const handleSubmit = (text: string) => {
  emit('send', text);
};

const handleModelChange = (modelId: string) => {
  emit('update:selectedModel', modelId);
};

const handleModelSelected = (modelId: string, modelName: string) => {
  emit('model-selected', modelId, modelName);
};
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.input-section {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.model-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 12px 24px 0;
  background: linear-gradient(to top, #fafafa 0%, #fff 100%);
}

.provider-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  transition: all 0.1s;
}

.provider-toggle:hover {
  background: #eee;
  color: #333;
}

.provider-label {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

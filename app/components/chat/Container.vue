<template>
  <div class="chat-container">
    <ChatMessageList
      :messages="messages"
      :is-streaming="isStreaming"
      @suggestion-click="handleSuggestionClick"
    />

    <!-- Unified input container -->
    <div class="unified-input-section">
      <div class="input-frame">
        <form class="unified-input-container" @submit.prevent="handleSubmit">
        <textarea
          ref="textareaRef"
          v-model="inputText"
          :placeholder="inputPlaceholder"
          rows="1"
          :disabled="isStreaming"
          @keydown="handleKeydown"
          @compositionstart="isComposing = true"
          @compositionend="isComposing = false"
        />

        <div class="input-toolbar">
          <div class="toolbar-left">
            <ModelsModelSelector
              v-if="models.length > 0"
              :model-value="selectedModel"
              :models="models"
              :provider-preferences="providerPreferences"
              @update:model-value="handleModelChange"
              @update:provider-preferences="handleProviderChange"
              @model-selected="handleModelSelected"
            />
          </div>

          <div class="toolbar-right">
            <button
              type="submit"
              class="send-btn"
              :disabled="!inputText.trim() || isStreaming"
              :class="{ active: inputText.trim() && !isStreaming }"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UIMessage } from 'ai';
import type { Model, ProviderPreferences } from '~/types';

const props = withDefaults(defineProps<{
  messages: UIMessage[];
  isStreaming?: boolean;
  models?: Model[];
  selectedModel?: string;
  providerPreferences?: ProviderPreferences;
}>(), {
  isStreaming: false,
  models: () => [],
  selectedModel: '',
});

const emit = defineEmits<{
  send: [text: string];
  'update:selectedModel': [modelId: string];
  'update:providerPreferences': [prefs: ProviderPreferences];
  'model-selected': [modelId: string, modelName: string];
}>();

// Input state
const inputText = ref('');
const textareaRef = ref<HTMLTextAreaElement>();
const isComposing = ref(false);

const inputPlaceholder = computed(() => {
  if (props.isStreaming) {
    return 'Wait for the response...';
  }
  return 'Send a message...';
});

const handleSubmit = () => {
  const text = inputText.value.trim();
  if (text && !props.isStreaming) {
    emit('send', text);
    inputText.value = '';
    // Reset height
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto';
    }
  }
};

const handleKeydown = (e: KeyboardEvent) => {
  // Submit on Enter (without Shift), but not during IME composition
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !isComposing.value) {
    e.preventDefault();
    handleSubmit();
  }
};

// Auto-resize textarea
watch(inputText, async () => {
  await nextTick();
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
    textareaRef.value.style.height =
      Math.min(textareaRef.value.scrollHeight, 200) + 'px';
  }
});

// Focus on mount
onMounted(() => {
  textareaRef.value?.focus();
});

const handleModelChange = (modelId: string) => {
  emit('update:selectedModel', modelId);
};

const handleProviderChange = (prefs: ProviderPreferences) => {
  emit('update:providerPreferences', prefs);
};

const handleModelSelected = (modelId: string, modelName: string) => {
  emit('model-selected', modelId, modelName);
};

const handleSuggestionClick = (suggestion: string) => {
  inputText.value = suggestion;
  textareaRef.value?.focus();
};
</script>

<style scoped>
.chat-container {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.unified-input-section {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 0 24px;
  background: transparent;
  pointer-events: none;
}

.input-frame {
  pointer-events: auto;
  background: #d4d4d4;
  border-radius: 20px 20px 0 0;
  padding: 6px 6px 0 6px;
  width: 100%;
  max-width: 800px;
}

.unified-input-container {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: none;
  border-radius: 16px 16px 0 0;
  overflow: hidden;
  width: 100%;
}

.unified-input-container:focus-within {
  box-shadow: none;
}

.unified-input-container textarea {
  width: 100%;
  box-sizing: border-box;
  border: none;
  background: transparent;
  resize: none;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.5;
  color: #171717;
  height: auto;
  min-height: 24px;
  max-height: 200px;
  overflow-y: auto;
  padding: 14px 16px 0;
}

.unified-input-container textarea::placeholder {
  color: #a0a0a0;
}

.unified-input-container textarea:focus {
  outline: none;
}

.unified-input-container textarea:disabled {
  color: #a0a0a0;
  cursor: not-allowed;
}

.input-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px 10px;
  min-height: 44px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: #e0e0e0;
  color: #a0a0a0;
  cursor: not-allowed;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.send-btn.active {
  background: #171717;
  color: #fff;
  cursor: pointer;
}

.send-btn.active:hover {
  background: #333;
  transform: scale(1.05);
}

.send-btn.active:active {
  transform: scale(0.98);
}

</style>

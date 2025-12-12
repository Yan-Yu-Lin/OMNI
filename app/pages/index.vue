<template>
  <div class="home-page">
    <!-- Welcome content -->
    <div class="welcome-section">
      <h1 class="welcome-title">AI Chat</h1>
      <p class="welcome-subtitle">Start a conversation with AI</p>

      <div class="suggestions">
        <button
          v-for="suggestion in suggestions"
          :key="suggestion"
          class="suggestion-chip"
          @click="handleSuggestionClick(suggestion)"
        >
          {{ suggestion }}
        </button>
      </div>
    </div>

    <!-- Unified input section at bottom -->
    <div class="unified-input-section">
      <form class="unified-input-container" @submit.prevent="handleSubmit">
        <textarea
          ref="textareaRef"
          v-model="inputText"
          placeholder="Message AI..."
          rows="1"
          @keydown="handleKeydown"
          @compositionstart="isComposing = true"
          @compositionend="isComposing = false"
        />

        <div class="input-toolbar">
          <div class="toolbar-left">
            <ModelsModelSelector
              v-if="models.length > 0"
              :model-value="selectedModelId"
              :models="models"
              :provider-preferences="providerPreferences"
              @update:model-value="selectedModelId = $event"
              @update:provider-preferences="providerPreferences = $event"
            />
          </div>

          <div class="toolbar-right">
            <button
              type="submit"
              class="send-btn"
              :disabled="!inputText.trim()"
              :class="{ active: inputText.trim() }"
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
</template>

<script setup lang="ts">
import { nanoid } from 'nanoid';
import type { ProviderPreferences } from '~/types';

const router = useRouter();
const { setPendingMessage } = useConversations();
const { settings, fetchSettings, updateSettings } = useSettings();
const { models, fetchModels } = useModels();

// Local state
const inputText = ref('');
const textareaRef = ref<HTMLTextAreaElement>();
const isComposing = ref(false);

// Model selection - defaults to settings
const selectedModelId = ref(settings.value.model);

// Provider preferences - defaults to settings
const providerPreferences = ref<ProviderPreferences>(
  settings.value.providerPreferences || { mode: 'auto', sort: 'throughput' }
);

// Sync with settings once loaded
watch(() => settings.value.model, (newModel) => {
  if (newModel && !selectedModelId.value) {
    selectedModelId.value = newModel;
  }
});

watch(() => settings.value.providerPreferences, (newPrefs) => {
  if (newPrefs) {
    providerPreferences.value = newPrefs;
  }
}, { deep: true });

// Save model and provider preferences when changed
watch(selectedModelId, async (newModel, oldModel) => {
  if (oldModel && newModel !== oldModel) {
    await updateSettings({ model: newModel });
  }
});

watch(providerPreferences, async (newPrefs, oldPrefs) => {
  if (oldPrefs && JSON.stringify(newPrefs) !== JSON.stringify(oldPrefs)) {
    await updateSettings({ providerPreferences: newPrefs });
  }
}, { deep: true });

// Suggestion prompts
const suggestions = [
  'Explain quantum computing',
  'Write a Python script',
  'Help me brainstorm ideas',
  'Summarize a topic',
];

// Handle suggestion chip click
const handleSuggestionClick = (suggestion: string) => {
  inputText.value = suggestion;
  textareaRef.value?.focus();
};

// Handle form submission
const handleSubmit = () => {
  const text = inputText.value.trim();
  if (!text) return;

  // Store message in pending state
  setPendingMessage(text, selectedModelId.value);

  // Generate new conversation ID and navigate
  const newId = nanoid();
  router.push(`/chat/${newId}`);
};

// Handle keyboard shortcuts
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

// Fetch data and focus on mount
onMounted(() => {
  fetchSettings();
  fetchModels();
  textareaRef.value?.focus();
});
</script>

<style scoped>
.home-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.welcome-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}

.welcome-title {
  font-size: 36px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 8px;
}

.welcome-subtitle {
  font-size: 16px;
  color: #666;
  margin: 0 0 32px;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: 500px;
}

.suggestion-chip {
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  transition: all 0.15s ease;
}

.suggestion-chip:hover {
  background: #eee;
  border-color: #ccc;
}

/* Unified input section - matches ChatContainer */
.unified-input-section {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  padding: 16px 24px 16px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.unified-input-container {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.unified-input-container:focus-within {
  border-color: #171717;
  box-shadow: 0 0 0 3px rgba(23, 23, 23, 0.06);
}

.unified-input-container textarea {
  flex: 1;
  border: none;
  background: transparent;
  resize: none;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.5;
  color: #171717;
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

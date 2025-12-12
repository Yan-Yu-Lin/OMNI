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

    <!-- Input section at bottom -->
    <div class="input-section">
      <div class="input-row">
        <ModelsModelSelector
          v-model="selectedModelId"
          :models="models"
          class="home-model-selector"
        />
      </div>
      <form class="chat-input" @submit.prevent="handleSubmit">
        <div class="input-wrapper">
          <textarea
            ref="textareaRef"
            v-model="inputText"
            placeholder="Message AI..."
            rows="1"
            @keydown="handleKeydown"
            @compositionstart="isComposing = true"
            @compositionend="isComposing = false"
          />
          <button
            type="submit"
            class="send-btn"
            :disabled="!inputText.trim()"
            :class="{ active: inputText.trim() }"
          >
            <svg
              width="20"
              height="20"
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
        <p class="input-hint">
          Press <kbd>Enter</kbd> to send, <kbd>Shift + Enter</kbd> for new line
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nanoid } from 'nanoid';

const router = useRouter();
const { setPendingMessage } = useConversations();
const { settings, fetchSettings } = useSettings();
const { models, fetchModels } = useModels();

// Local state
const inputText = ref('');
const textareaRef = ref<HTMLTextAreaElement>();
const isComposing = ref(false);

// Model selection - defaults to settings
const selectedModelId = ref(settings.value.model);

// Sync with settings once loaded
watch(() => settings.value.model, (newModel) => {
  if (newModel && !selectedModelId.value) {
    selectedModelId.value = newModel;
  }
});

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

.input-section {
  padding: 16px 24px 12px;
  background: linear-gradient(to top, #fafafa 0%, #fff 100%);
  border-top: 1px solid #eaeaea;
}

.input-row {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.home-model-selector {
  /* Center the model selector */
}

.chat-input {
  max-width: 800px;
  margin: 0 auto;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 12px 16px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input-wrapper:focus-within {
  border-color: #171717;
  box-shadow: 0 0 0 3px rgba(23, 23, 23, 0.06);
}

textarea {
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
}

textarea::placeholder {
  color: #a0a0a0;
}

textarea:focus {
  outline: none;
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
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

.input-hint {
  font-size: 11px;
  color: #a0a0a0;
  margin-top: 8px;
  text-align: center;
}

.input-hint kbd {
  display: inline-block;
  padding: 2px 6px;
  font-family: inherit;
  font-size: 10px;
  background: #f0f0f0;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin: 0 2px;
}
</style>

<template>
  <form class="chat-input" @submit.prevent="handleSubmit">
    <div class="input-wrapper">
      <textarea
        ref="textareaRef"
        v-model="input"
        :placeholder="placeholder"
        rows="1"
        :disabled="disabled"
        @keydown="handleKeydown"
      />
      <button
        type="submit"
        class="send-btn"
        :disabled="!input.trim() || disabled"
        :class="{ active: input.trim() && !disabled }"
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
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    placeholder?: string;
  }>(),
  {
    disabled: false,
    placeholder: 'Send a message...',
  }
);

const emit = defineEmits<{
  submit: [text: string];
}>();

const input = ref('');
const textareaRef = ref<HTMLTextAreaElement>();

const handleSubmit = () => {
  const text = input.value.trim();
  if (text && !props.disabled) {
    emit('submit', text);
    input.value = '';
    // Reset height
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto';
    }
  }
};

const handleKeydown = (e: KeyboardEvent) => {
  // Submit on Enter (without Shift)
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
};

// Auto-resize textarea
watch(input, () => {
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
</script>

<style scoped>
.chat-input {
  padding: 16px 24px 12px;
  background: linear-gradient(to top, #fafafa 0%, #fff 100%);
  border-top: 1px solid #eaeaea;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
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

textarea:disabled {
  color: #a0a0a0;
  cursor: not-allowed;
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

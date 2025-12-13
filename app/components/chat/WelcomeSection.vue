<template>
  <div class="welcome-section">
    <h1 class="welcome-title">AI Chat</h1>
    <p class="welcome-subtitle">Start a conversation with AI</p>

    <div class="suggestions">
      <button
        v-for="suggestion in suggestions"
        :key="suggestion"
        class="suggestion-chip"
        @click="$emit('suggestion-click', suggestion)"
      >
        {{ suggestion }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  'suggestion-click': [suggestion: string];
}>();

const suggestions = [
  'Explain quantum computing',
  'Write a Python script',
  'Help me brainstorm ideas',
  'Summarize a topic',
];
</script>

<style scoped>
.welcome-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  padding-bottom: 160px; /* Space for input */
}

.welcome-title {
  font-size: 36px;
  font-weight: 600;
  color: var(--color-text-primary, #171717);
  margin: 0 0 8px;
}

.welcome-subtitle {
  font-size: 16px;
  color: var(--color-text-secondary, #666);
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
  background: var(--color-bg-secondary, #f5f5f5);
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 20px;
  font-size: 14px;
  color: var(--color-text-primary, #333);
  cursor: pointer;
  transition: all 0.15s ease;
}

.suggestion-chip:hover {
  background: #eee;
  border-color: #ccc;
}
</style>

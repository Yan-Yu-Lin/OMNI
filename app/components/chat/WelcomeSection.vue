<template>
  <div class="welcome-section">
    <h1 class="welcome-title">How can I help you?</h1>

    <!-- Category tabs -->
    <div class="category-tabs">
      <button
        v-for="category in categories"
        :key="category.id"
        class="category-tab"
        :class="{ active: activeCategory === category.id }"
        @click="activeCategory = category.id"
      >
        <component :is="category.icon" class="tab-icon" />
        <span>{{ category.label }}</span>
      </button>
    </div>

    <!-- Suggestion list -->
    <div class="suggestions-list">
      <button
        v-for="(suggestion, index) in currentSuggestions"
        :key="suggestion"
        class="suggestion-item"
        :class="{ highlighted: hoveredIndex === index }"
        @mouseenter="hoveredIndex = index"
        @mouseleave="hoveredIndex = -1"
        @click="$emit('suggestion-click', suggestion)"
      >
        {{ suggestion }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';

defineEmits<{
  'suggestion-click': [suggestion: string];
}>();

const activeCategory = ref('create');
const hoveredIndex = ref(0); // Default highlight first item

// Icon components as render functions
const SparklesIcon = () => h('svg', {
  width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
}, [
  h('path', { d: 'M12 3v18m0-18l-3 3m3-3l3 3M3 12h18M3 12l3-3m-3 3l3 3m12-3l3-3m-3 3l3 3' }),
]);

const CompassIcon = () => h('svg', {
  width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
}, [
  h('circle', { cx: 12, cy: 12, r: 10 }),
  h('polygon', { points: '16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76' }),
]);

const CodeIcon = () => h('svg', {
  width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
}, [
  h('polyline', { points: '16 18 22 12 16 6' }),
  h('polyline', { points: '8 6 2 12 8 18' }),
]);

const BookIcon = () => h('svg', {
  width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
}, [
  h('path', { d: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z' }),
  h('path', { d: 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' }),
]);

const categories = [
  { id: 'create', label: 'Create', icon: SparklesIcon },
  { id: 'explore', label: 'Explore', icon: CompassIcon },
  { id: 'code', label: 'Code', icon: CodeIcon },
  { id: 'learn', label: 'Learn', icon: BookIcon },
];

const suggestionsByCategory: Record<string, string[]> = {
  create: [
    'Write a short story about time travel',
    'Generate ideas for a mobile app',
    'Draft an email to my team',
    'Create a meal plan for the week',
  ],
  explore: [
    'What are the latest AI developments?',
    'Explain how black holes work',
    'Compare different programming paradigms',
    'What is the meaning of life?',
  ],
  code: [
    'Write a Python script to analyze data',
    'Debug this code snippet',
    'Explain this algorithm step by step',
    'Convert this function to TypeScript',
  ],
  learn: [
    'How does machine learning work?',
    'Teach me about quantum computing',
    'Explain React hooks with examples',
    'What is the history of the internet?',
  ],
};

const currentSuggestions = computed(() => suggestionsByCategory[activeCategory.value]);
</script>

<style scoped>
.welcome-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 48px 24px;
  padding-top: 18vh;
  padding-bottom: 160px;
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
}

.welcome-title {
  font-size: 32px;
  font-weight: 600;
  color: var(--color-text-primary, #171717);
  margin: 0 0 28px;
  text-align: left;
}

/* Category tabs */
.category-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.category-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary, #666);
  cursor: pointer;
  transition: all 0.15s ease;
}

.category-tab:hover {
  background: var(--color-bg-secondary, #f5f5f5);
  border-color: #ccc;
}

.category-tab.active {
  background: var(--color-text-primary, #171717);
  border-color: var(--color-text-primary, #171717);
  color: #fff;
}

.tab-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* Suggestion list */
.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: transparent;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  color: var(--color-text-primary, #333);
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.suggestion-item:hover,
.suggestion-item.highlighted {
  background: var(--color-bg-secondary, #f5f5f5);
}

.suggestion-item:active {
  background: #eaeaea;
}
</style>

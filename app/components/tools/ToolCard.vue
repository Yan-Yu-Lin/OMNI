<template>
  <div class="tool-card" :class="[state, { expanded: isExpanded }]">
    <div class="tool-header" @click="toggleExpanded">
      <div class="tool-indicator">
        <div class="indicator-dot" :class="state">
          <span v-if="isLoading" class="spinner" />
        </div>
      </div>

      <div class="tool-info">
        <span class="tool-name">{{ formatToolName(toolName) }}</span>
        <span class="tool-status">{{ statusText }}</span>
      </div>

      <div class="tool-toggle">
        <svg
          class="chevron"
          :class="{ rotated: isExpanded }"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>

    <Transition name="expand">
      <div v-if="isExpanded" class="tool-body">
        <div v-if="input" class="tool-section input-section">
          <div class="section-header">
            <span class="section-label">Input</span>
          </div>
          <div class="section-content">
            <slot name="input" :input="input">
              <pre class="default-json">{{ JSON.stringify(input, null, 2) }}</pre>
            </slot>
          </div>
        </div>

        <div
          v-if="state === 'output-available' && output"
          class="tool-section output-section"
        >
          <div class="section-header">
            <span class="section-label">Output</span>
          </div>
          <div class="section-content">
            <slot name="output" :output="output">
              <pre class="default-json">{{ JSON.stringify(output, null, 2) }}</pre>
            </slot>
          </div>
        </div>

        <div v-if="state === 'output-error' && errorText" class="tool-section error-section">
          <div class="section-header">
            <span class="section-label">Error</span>
          </div>
          <div class="section-content error-content">
            {{ errorText }}
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { ToolState } from '~/types';

const props = defineProps<{
  toolName: string;
  state: ToolState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}>();

const isExpanded = ref(false);

// Auto-expand on completion or error
watch(
  () => props.state,
  (newState) => {
    if (newState === 'output-available' || newState === 'output-error') {
      isExpanded.value = true;
    }
  }
);

const isLoading = computed(() => {
  return props.state === 'input-streaming' || props.state === 'input-available';
});

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

const formatToolName = (name: string) => {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const statusText = computed(() => {
  switch (props.state) {
    case 'input-streaming':
      return 'Preparing...';
    case 'input-available':
      return 'Running...';
    case 'output-available':
      return 'Complete';
    case 'output-error':
      return 'Failed';
    default:
      return '';
  }
});
</script>

<style scoped>
.tool-card {
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  margin: 12px 0;
  overflow: hidden;
  background: #fafafa;
  transition: all 0.2s ease;
}

.tool-card:hover {
  border-color: #d0d0d0;
}

.tool-card.output-error {
  border-color: #fecaca;
  background: #fef2f2;
}

.tool-card.output-available {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.tool-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  gap: 12px;
}

.tool-header:hover {
  background: rgba(0, 0, 0, 0.02);
}

.tool-indicator {
  flex-shrink: 0;
}

.indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d4d4d4;
  position: relative;
}

.indicator-dot.input-streaming,
.indicator-dot.input-available {
  background: #3b82f6;
  animation: pulse 1.5s ease-in-out infinite;
}

.indicator-dot.output-available {
  background: #22c55e;
}

.indicator-dot.output-error {
  background: #ef4444;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
}

.spinner {
  position: absolute;
  inset: -4px;
  border: 2px solid transparent;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.tool-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.tool-name {
  font-weight: 600;
  font-size: 13px;
  color: #171717;
  font-family:
    'SF Mono',
    'Menlo',
    'Monaco',
    'Consolas',
    monospace;
}

.tool-status {
  font-size: 12px;
  color: #737373;
}

.tool-toggle {
  flex-shrink: 0;
  color: #a3a3a3;
}

.chevron {
  transition: transform 0.2s ease;
}

.chevron.rotated {
  transform: rotate(180deg);
}

.tool-body {
  border-top: 1px solid #e5e5e5;
}

.tool-section {
  padding: 16px;
}

.tool-section + .tool-section {
  border-top: 1px solid #e5e5e5;
}

.section-header {
  margin-bottom: 10px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #737373;
}

.section-content {
  font-size: 13px;
  line-height: 1.5;
}

.default-json {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family:
    'SF Mono',
    'Menlo',
    'Monaco',
    'Consolas',
    monospace;
  font-size: 12px;
  background: #fff;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e5e5e5;
  max-height: 300px;
  overflow-y: auto;
}

.error-section {
  background: #fef2f2;
}

.error-content {
  color: #dc2626;
  font-weight: 500;
}

/* Expand transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 1000px;
}
</style>

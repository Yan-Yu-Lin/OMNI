<template>
  <div class="tool-row" :class="{ expanded: isExpanded }">
    <div class="tool-row-header" @click="toggleExpanded">
      <div class="tool-row-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      </div>
      <span class="tool-row-description">{{ description }}</span>
      <span v-if="isLoading" class="tool-row-status">Running...</span>
      <svg
        class="tool-row-chevron"
        :class="{ open: isExpanded }"
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

    <div class="tool-row-content" :class="{ open: isExpanded }">
      <div class="tool-row-content-inner">
        <!-- Bash command section -->
        <div class="bash-section">
          <div class="section-label">bash</div>
          <div class="bash-command">{{ input?.command }}</div>
        </div>

        <!-- Output section (only when complete) -->
        <div v-if="state === 'output-available' && output" class="output-section">
          <div class="section-label">Output</div>
          <div class="output-content">
            <pre v-if="output.stdout" class="stdout">{{ output.stdout }}</pre>
            <pre v-if="output.stderr" class="stderr">{{ output.stderr }}</pre>
            <span v-if="!output.stdout && !output.stderr" class="no-output">No output</span>
          </div>
        </div>

        <!-- Error section -->
        <div v-if="state === 'output-error' && errorText" class="error-section">
          <div class="section-label">Error</div>
          <div class="error-content">{{ errorText }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ToolState } from '~/types';

interface BashInput {
  description?: string;
  command: string;
  timeout?: number;
  workdir?: string;
}

interface BashOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

const props = defineProps<{
  state: ToolState;
  input?: BashInput;
  output?: BashOutput;
  errorText?: string;
}>();

const isExpanded = ref(false);

const description = computed(() => {
  return props.input?.description || props.input?.command?.slice(0, 50) || 'Running command...';
});

const isLoading = computed(() => {
  return props.state === 'input-streaming' || props.state === 'input-available';
});

// Auto-expand when output arrives
watch(
  () => props.state,
  (newState) => {
    if (newState === 'output-available' || newState === 'output-error') {
      isExpanded.value = true;
    }
  }
);

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};
</script>

<style scoped>
.tool-row {
  width: 100%;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  margin: 8px 0;
  background: #fff;
  overflow: hidden;
  transition: background-color 0.15s ease;
}

.tool-row:not(.expanded):hover {
  background: #fafafa;
}

.tool-row-header {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.tool-row:not(.expanded) .tool-row-header:hover {
  background: rgba(0, 0, 0, 0.02);
}

.tool-row-icon {
  flex-shrink: 0;
  color: #666;
  display: flex;
  align-items: center;
}

.tool-row-description {
  flex: 1;
  font-size: 14px;
  color: #171717;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tool-row-status {
  font-size: 12px;
  color: #666;
  flex-shrink: 0;
}

.tool-row-chevron {
  flex-shrink: 0;
  color: #999;
  transition: transform 0.2s ease;
}

.tool-row-chevron.open {
  transform: rotate(180deg);
}

/* CSS grid expand animation */
.tool-row-content {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.15s ease-out;
}

.tool-row-content.open {
  grid-template-rows: 1fr;
}

.tool-row-content-inner {
  min-height: 0;
  overflow: hidden;
}

/* Sections */
.bash-section,
.output-section,
.error-section {
  padding: 12px 14px;
  background: #f9fafb;
  border-top: 1px solid #e5e5e5;
}

.section-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 8px;
}

.bash-command {
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  color: #059669;
  word-break: break-all;
  white-space: pre-wrap;
}

.output-content {
  background: #18181b;
  border-radius: 6px;
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.stdout,
.stderr {
  margin: 0;
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.stdout {
  color: #fafafa;
}

.stderr {
  color: #fca5a5;
}

.no-output {
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
}

.error-section {
  background: #fef2f2;
}

.error-content {
  font-size: 13px;
  color: #dc2626;
}
</style>

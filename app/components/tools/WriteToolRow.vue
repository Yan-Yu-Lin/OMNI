<template>
  <div class="tool-row" :class="{ expanded: isExpanded }">
    <div class="tool-row-header" @click="toggleExpanded">
      <div class="tool-row-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      </div>
      <span class="tool-row-description">{{ description }}</span>
      <span v-if="isLoading" class="tool-row-status">Writing...</span>
      <span v-else-if="filename" class="tool-row-meta">{{ filename }}</span>
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
        <!-- Success info -->
        <div v-if="output?.success" class="success-section">
          <div class="success-indicator">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>File written successfully</span>
          </div>
          <div class="file-details">
            <span class="file-path">{{ output.path }}</span>
            <span class="file-size">{{ formatBytes(output.size) }}</span>
          </div>
        </div>

        <!-- Error -->
        <div v-if="state === 'output-error' && errorText" class="error-section">
          <div class="error-content">{{ errorText }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ToolState } from '~/types';

interface WriteInput {
  description?: string;
  path: string;
  content: string;
}

interface WriteOutput {
  success: boolean;
  path: string;
  size: number;
}

const props = defineProps<{
  state: ToolState;
  input?: WriteInput;
  output?: WriteOutput;
  errorText?: string;
}>();

const isExpanded = ref(false);

const isLoading = computed(() => {
  return props.state === 'input-streaming' || props.state === 'input-available';
});

const description = computed(() => {
  return props.input?.description || 'Writing file';
});

const filename = computed(() => {
  const path = props.output?.path || props.input?.path;
  if (!path) return '';
  return path.split('/').pop() || path;
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

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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

.tool-row-meta {
  font-size: 12px;
  color: #666;
  flex-shrink: 0;
  font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
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

/* Success section */
.success-section {
  padding: 12px 14px;
  border-top: 1px solid #e5e5e5;
  background: #f0fdf4;
}

.success-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #166534;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
}

.success-indicator svg {
  color: #22c55e;
}

.file-details {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.file-path {
  font-size: 12px;
  font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
  color: #374151;
}

.file-size {
  font-size: 11px;
  color: #6b7280;
}

/* Error section */
.error-section {
  padding: 12px 14px;
  border-top: 1px solid #e5e5e5;
  background: #fef2f2;
}

.error-content {
  font-size: 13px;
  color: #dc2626;
}
</style>

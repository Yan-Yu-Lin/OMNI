<template>
  <div class="sandbox-file-result">
    <!-- Read operation -->
    <template v-if="isReadOperation">
      <div class="file-header">
        <div class="file-path">
          <svg class="file-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 2.5A1.5 1.5 0 0 1 5.5 1h4.379a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 1 .439 1.061V13.5A1.5 1.5 0 0 1 12 15H5.5A1.5 1.5 0 0 1 4 13.5v-11z"
              stroke="currentColor"
              stroke-width="1.2"
            />
          </svg>
          {{ output.path }}
        </div>
        <div class="file-size">{{ formatSize(output.size) }}</div>
      </div>

      <div class="file-content-wrapper">
        <pre class="file-content"><code>{{ output.content }}</code></pre>
      </div>
    </template>

    <!-- Write operation -->
    <template v-else>
      <div class="write-result">
        <div class="write-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div class="write-info">
          <div class="write-message">File written successfully</div>
          <div class="file-details">
            <span class="file-path-inline">{{ output.path }}</span>
            <span class="file-size-inline">{{ formatSize(output.size) }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
interface SandboxReadOutput {
  content: string;
  size: number;
  path: string;
}

interface SandboxWriteOutput {
  success: boolean;
  path: string;
  size: number;
}

type SandboxFileOutput = SandboxReadOutput | SandboxWriteOutput;

const props = defineProps<{
  output: SandboxFileOutput;
}>();

// Determine if this is a read or write operation
const isReadOperation = computed(() => {
  return 'content' in props.output;
});

const formatSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
</script>

<style scoped>
.sandbox-file-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.file-path {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  color: #171717;
  font-weight: 500;
}

.file-icon {
  color: #737373;
  flex-shrink: 0;
}

.file-size {
  font-size: 12px;
  color: #737373;
}

.file-content-wrapper {
  position: relative;
}

.file-content {
  margin: 0;
  padding: 12px;
  background: #18181b;
  color: #fafafa;
  border-radius: 6px;
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 400px;
  overflow-y: auto;
}

.file-content code {
  font-family: inherit;
}

/* Write result styles */
.write-result {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
}

.write-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #22c55e;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.write-info {
  flex: 1;
  min-width: 0;
}

.write-message {
  font-size: 14px;
  font-weight: 500;
  color: #166534;
  margin-bottom: 4px;
}

.file-details {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.file-path-inline {
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  color: #374151;
  word-break: break-all;
}

.file-size-inline {
  font-size: 12px;
  color: #737373;
}
</style>

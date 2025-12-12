<template>
  <div class="sandbox-bash-result">
    <div class="result-header">
      <div class="exit-code" :class="exitCodeClass">
        Exit {{ output.exitCode }}
      </div>
      <div class="execution-time">
        {{ formatTime(output.executionTime) }}
      </div>
    </div>

    <div v-if="output.stdout" class="output-section stdout-section">
      <div class="section-label">stdout</div>
      <pre class="output-content">{{ output.stdout }}</pre>
    </div>

    <div v-if="output.stderr" class="output-section stderr-section">
      <div class="section-label">stderr</div>
      <pre class="output-content stderr">{{ output.stderr }}</pre>
    </div>

    <div v-if="!output.stdout && !output.stderr" class="no-output">
      No output
    </div>
  </div>
</template>

<script setup lang="ts">
interface SandboxBashOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

const props = defineProps<{
  output: SandboxBashOutput;
}>();

const exitCodeClass = computed(() => ({
  success: props.output.exitCode === 0,
  error: props.output.exitCode !== 0,
}));

const formatTime = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
};
</script>

<style scoped>
.sandbox-bash-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.exit-code {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
}

.exit-code.success {
  background: #dcfce7;
  color: #166534;
}

.exit-code.error {
  background: #fee2e2;
  color: #991b1b;
}

.execution-time {
  font-size: 12px;
  color: #737373;
}

.output-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #737373;
}

.output-content {
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

.output-content.stderr {
  background: #2d1f1f;
  color: #fca5a5;
}

.no-output {
  font-size: 13px;
  color: #737373;
  font-style: italic;
}
</style>

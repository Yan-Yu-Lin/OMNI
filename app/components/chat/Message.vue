<template>
  <div class="message" :class="[message.role, { streaming: isStreaming }]">
    <div class="message-wrapper">
      <div class="message-content">
        <template v-for="(part, index) in message.parts" :key="index">
          <!-- Text parts -->
          <div v-if="part.type === 'text'" class="text-part">
            <!-- Use markdown rendering for assistant messages -->
            <ChatMarkdownRenderer
              v-if="message.role === 'assistant'"
              :content="part.text"
              class="text-content"
            />
            <!-- Plain text for user messages -->
            <span v-else class="text-content plain-text">{{ part.text }}</span>
            <span v-if="isStreaming && isLastTextPart(index)" class="cursor"></span>
          </div>

          <!-- Web Search tool (compact) -->
          <ToolsWebSearchCard
            v-else-if="part.type === 'tool-web_search'"
            :state="part.state"
            :input="part.input"
            :output="part.output"
          />

          <!-- Scrape URL tool -->
          <ToolsToolCard
            v-else-if="part.type === 'tool-scrape_url'"
            tool-name="scrape_url"
            :state="part.state"
            :input="part.input"
            :output="part.output"
            :error-text="part.errorText"
          >
            <template #input="{ input: toolInput }">
              <div class="tool-input-summary">
                <strong>URL:</strong>
                <a :href="toolInput.url" target="_blank" rel="noopener" class="tool-url">
                  {{ toolInput.url }}
                </a>
              </div>
            </template>
            <template #output="{ output: toolOutput }">
              <ToolsScrapeResult :result="toolOutput" />
            </template>
          </ToolsToolCard>

          <!-- Crawl Site tool -->
          <ToolsToolCard
            v-else-if="part.type === 'tool-crawl_site'"
            tool-name="crawl_site"
            :state="part.state"
            :input="part.input"
            :output="part.output"
            :error-text="part.errorText"
          >
            <template #input="{ input: toolInput }">
              <div class="tool-input-summary">
                <div>
                  <strong>URL:</strong>
                  <a :href="toolInput.url" target="_blank" rel="noopener" class="tool-url">
                    {{ toolInput.url }}
                  </a>
                </div>
                <div class="tool-input-detail">
                  Limit: {{ toolInput.limit || 10 }} pages, Max depth: {{ toolInput.maxDepth || 2 }}
                </div>
              </div>
            </template>
            <template #output="{ output: toolOutput }">
              <ToolsCrawlResults :result="toolOutput" />
            </template>
          </ToolsToolCard>

          <!-- Map Site tool -->
          <ToolsToolCard
            v-else-if="part.type === 'tool-map_site'"
            tool-name="map_site"
            :state="part.state"
            :input="part.input"
            :output="part.output"
            :error-text="part.errorText"
          >
            <template #input="{ input: toolInput }">
              <div class="tool-input-summary">
                <div>
                  <strong>URL:</strong>
                  <a :href="toolInput.url" target="_blank" rel="noopener" class="tool-url">
                    {{ toolInput.url }}
                  </a>
                </div>
                <div class="tool-input-detail">
                  <span>Limit: {{ toolInput.limit || 100 }} URLs</span>
                  <span v-if="toolInput.search">, Filter: "{{ toolInput.search }}"</span>
                </div>
              </div>
            </template>
            <template #output="{ output: toolOutput }">
              <ToolsMapResults :result="toolOutput" />
            </template>
          </ToolsToolCard>

          <!-- Sandbox Bash tool -->
          <ToolsToolCard
            v-else-if="part.type === 'tool-sandbox_bash'"
            tool-name="sandbox_bash"
            :state="part.state"
            :input="part.input"
            :output="part.output"
            :error-text="part.errorText"
          >
            <template #input="{ input: toolInput }">
              <div class="tool-input-summary">
                <div class="bash-command">
                  <code>{{ toolInput.command }}</code>
                </div>
                <div v-if="toolInput.workdir !== '/workspace'" class="tool-input-detail">
                  in {{ toolInput.workdir }}
                </div>
              </div>
            </template>
            <template #output="{ output: toolOutput }">
              <ToolsSandboxBashResult :output="toolOutput" />
            </template>
          </ToolsToolCard>

          <!-- Sandbox Read tool -->
          <ToolsToolCard
            v-else-if="part.type === 'tool-sandbox_read'"
            tool-name="sandbox_read"
            :state="part.state"
            :input="part.input"
            :output="part.output"
            :error-text="part.errorText"
          >
            <template #input="{ input: toolInput }">
              <div class="tool-input-summary">
                <strong>Read:</strong>
                <code class="file-path">{{ toolInput.path }}</code>
              </div>
            </template>
            <template #output="{ output: toolOutput }">
              <ToolsSandboxFileResult :output="toolOutput" />
            </template>
          </ToolsToolCard>

          <!-- Sandbox Write tool -->
          <ToolsToolCard
            v-else-if="part.type === 'tool-sandbox_write'"
            tool-name="sandbox_write"
            :state="part.state"
            :input="part.input"
            :output="part.output"
            :error-text="part.errorText"
          >
            <template #input="{ input: toolInput }">
              <div class="tool-input-summary">
                <div>
                  <strong>Write:</strong>
                  <code class="file-path">{{ toolInput.path }}</code>
                </div>
                <div class="tool-input-detail">
                  {{ formatBytes(toolInput.content?.length || 0) }}
                </div>
              </div>
            </template>
            <template #output="{ output: toolOutput }">
              <ToolsSandboxFileResult :output="toolOutput" />
            </template>
          </ToolsToolCard>

          <!-- Generic tool fallback -->
          <ToolsToolCard
            v-else-if="part.type.startsWith('tool-')"
            :tool-name="getToolName(part.type)"
            :state="part.state"
            :input="part.input"
            :output="part.output"
            :error-text="part.errorText"
          />

          <!-- Step start marker for multi-step tool calls -->
          <div v-else-if="part.type === 'step-start' && index > 0" class="step-divider">
            <hr />
          </div>
        </template>
        <!-- Show cursor if streaming but no parts yet -->
        <span
          v-if="isStreaming && (!message.parts || message.parts.length === 0)"
          class="cursor"
        />
      </div>

      <!-- Hover toolbar -->
      <div v-if="!isStreaming" class="message-toolbar">
        <span v-if="message.createdAt" class="toolbar-timestamp">
          {{ formatTime(message.createdAt) }}
        </span>
        <button class="toolbar-btn" title="Copy" @click="handleCopy">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
        </button>
        <button v-if="message.role === 'user'" class="toolbar-btn" title="Edit" @click="$emit('edit', message)">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            <path d="m15 5 4 4"/>
          </svg>
        </button>
        <button v-if="message.role === 'assistant'" class="toolbar-btn" title="Regenerate" @click="$emit('regenerate', message)">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M8 16H3v5"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UIMessage } from 'ai';

const props = defineProps<{
  message: UIMessage;
  isStreaming?: boolean;
}>();

const emit = defineEmits<{
  edit: [message: UIMessage];
  regenerate: [message: UIMessage];
}>();

// Format timestamp for display
const formatTime = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
};

// Copy message text to clipboard
const handleCopy = async () => {
  const textParts = props.message.parts
    .filter((p) => p.type === 'text')
    .map((p) => (p as { type: 'text'; text: string }).text)
    .join('\n');

  try {
    await navigator.clipboard.writeText(textParts);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

const isLastTextPart = (index: number): boolean => {
  // Check if this is the last text part in the message
  for (let i = props.message.parts.length - 1; i >= 0; i--) {
    if (props.message.parts[i].type === 'text') {
      return i === index;
    }
  }
  return false;
};

const getToolName = (type: string): string => {
  return type.replace('tool-', '');
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
</script>

<style scoped>
.message {
  display: flex;
  padding: 8px 24px;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-wrapper {
  display: flex;
  flex-direction: column;
  max-width: 75%;
}

.message.assistant .message-wrapper {
  max-width: 100%;
}

.message-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.message:hover .message-toolbar {
  opacity: 1;
}

.message.user .message-toolbar {
  justify-content: flex-end;
}

.toolbar-timestamp {
  font-size: 11px;
  color: #999;
  margin-right: 4px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #999;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.toolbar-btn:hover {
  background: #f0f0f0;
  color: #666;
}

.message-content {
  font-size: 15px;
  line-height: 1.7;
  color: #333;
}

/* User bubble */
.message.user .message-content {
  background: #f5f5f5;
  padding: 12px 16px;
  border-radius: 18px 18px 4px 18px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

/* Assistant - full width, no bubble */
.message.assistant .message-content {
  width: 100%;
  padding: 0;
}

.text-part {
  display: block;
}

.text-content {
  word-break: break-word;
}

.text-content.plain-text {
  white-space: pre-wrap;
}

.cursor {
  display: inline-block;
  width: 2px;
  height: 1.1em;
  background: #171717;
  margin-left: 2px;
  animation: blink 1s step-end infinite;
  vertical-align: text-bottom;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.tool-input-summary {
  font-size: 13px;
  color: #374151;
}

.tool-input-summary strong {
  color: #171717;
}

.tool-input-detail {
  color: #737373;
  font-size: 12px;
  margin-left: 4px;
}

.tool-url {
  color: #1a0dab;
  text-decoration: none;
  word-break: break-all;
}

.tool-url:hover {
  text-decoration: underline;
}

.step-divider {
  margin: 20px 0;
}

.step-divider hr {
  border: none;
  border-top: 1px dashed #d4d4d4;
}

.bash-command {
  background: #18181b;
  padding: 8px 12px;
  border-radius: 6px;
  margin: 4px 0;
}

.bash-command code {
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  color: #fafafa;
  word-break: break-all;
}

.file-path {
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  color: #374151;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>

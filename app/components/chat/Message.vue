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

          <!-- Web Search tool -->
          <ToolsSearchToolRow
            v-else-if="part.type === 'tool-web_search'"
            :state="part.state"
            :input="part.input"
            :output="part.output"
          />

          <!-- Scrape URL tool (Fetch) -->
          <ToolsFetchToolRow
            v-else-if="part.type === 'tool-scrape_url'"
            :state="part.state"
            :input="part.input"
            :output="part.output"
            :error-text="part.errorText"
          />

          <!-- Crawl Site tool -->
          <ToolsCrawlToolRow
            v-else-if="part.type === 'tool-crawl_site'"
            :state="part.state"
            :input="part.input"
            :output="part.output"
            :error-text="part.errorText"
          />

          <!-- Map Site tool -->
          <ToolsMapToolRow
            v-else-if="part.type === 'tool-map_site'"
            :state="part.state"
            :input="part.input"
            :output="part.output"
            :error-text="part.errorText"
          />

          <!-- Sandbox Bash tool -->
          <ToolsBashToolRow
            v-else-if="part.type === 'tool-sandbox_bash'"
            :state="part.state"
            :input="part.input"
            :output="part.output"
            :error-text="part.errorText"
          />

          <!-- Sandbox Read tool -->
          <ToolsReadToolRow
            v-else-if="part.type === 'tool-sandbox_read'"
            :state="part.state"
            :input="part.input"
            :output="part.output"
            :error-text="part.errorText"
          />

          <!-- Sandbox Write tool -->
          <ToolsWriteToolRow
            v-else-if="part.type === 'tool-sandbox_write'"
            :state="part.state"
            :input="part.input"
            :output="part.output"
            :error-text="part.errorText"
          />

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
        <ChatBranchNavigation
          :sibling-info="siblingInfo"
          @switch-branch="$emit('switch-branch', $event)"
        />
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
import type { SiblingInfo } from '~/types';

const props = defineProps<{
  message: UIMessage;
  isStreaming?: boolean;
  siblingInfo?: SiblingInfo | null;
}>();

const emit = defineEmits<{
  edit: [message: UIMessage];
  regenerate: [message: UIMessage];
  'switch-branch': [messageId: string];
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
  width: 100%;
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

.step-divider {
  margin: 20px 0;
}

.step-divider hr {
  border: none;
  border-top: 1px dashed #d4d4d4;
}
</style>

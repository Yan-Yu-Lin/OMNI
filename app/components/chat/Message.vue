<template>
  <div class="message" :class="[message.role, { streaming: isStreaming }]">
    <div class="message-avatar">
      <div class="avatar" :class="message.role">
        {{ message.role === 'user' ? 'Y' : 'A' }}
      </div>
    </div>
    <div class="message-body">
      <div class="message-header">
        <span class="message-role">{{
          message.role === 'user' ? 'You' : 'Assistant'
        }}</span>
      </div>
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
            <span v-if="isStreaming && isLastTextPart(index)" class="cursor" />
          </div>

          <!-- Web Search tool -->
          <ToolsToolCard
            v-else-if="part.type === 'tool-web_search'"
            tool-name="web_search"
            :state="part.state"
            :input="part.input"
            :output="part.output"
            :error-text="part.errorText"
          >
            <template #input="{ input: toolInput }">
              <div class="tool-input-summary">
                <strong>Query:</strong> {{ toolInput.query }}
                <span v-if="toolInput.limit" class="tool-input-detail">
                  ({{ toolInput.limit }} results)
                </span>
              </div>
            </template>
            <template #output="{ output: toolOutput }">
              <ToolsSearchResults :results="toolOutput.results" />
            </template>
          </ToolsToolCard>

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
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UIMessage } from 'ai';

const props = defineProps<{
  message: UIMessage;
  isStreaming?: boolean;
}>();

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
  gap: 16px;
  padding: 24px 32px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  background: #f8f8f8;
}

.message.assistant {
  background: #fff;
}

.message-avatar {
  flex-shrink: 0;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
}

.avatar.user {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.avatar.assistant {
  background: #171717;
  color: #fff;
}

.message-body {
  flex: 1;
  min-width: 0;
}

.message-header {
  margin-bottom: 6px;
}

.message-role {
  font-size: 13px;
  font-weight: 600;
  color: #171717;
}

.message-content {
  font-size: 15px;
  line-height: 1.7;
  color: #333;
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
</style>

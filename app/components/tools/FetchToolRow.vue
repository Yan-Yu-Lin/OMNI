<template>
  <div class="tool-row" :class="{ expanded: isExpanded }">
    <div class="tool-row-header" @click="toggleExpanded">
      <div class="tool-row-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </div>
      <span class="tool-row-description">{{ title }}</span>
      <span v-if="isLoading" class="tool-row-status">Fetching...</span>
      <span v-else-if="domain" class="tool-row-meta">{{ domain }}</span>
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
        <!-- URL link -->
        <div v-if="output?.url" class="url-section">
          <a :href="output.url" target="_blank" rel="noopener" class="url-link">
            {{ output.url }}
          </a>
        </div>

        <!-- Page content -->
        <div v-if="output?.markdown" class="content-section">
          <div class="section-label">Content</div>
          <div class="markdown-content">{{ truncatedContent }}</div>
        </div>

        <!-- Links found -->
        <details v-if="output?.links && output.links.length > 0" class="links-section">
          <summary class="links-toggle">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            Links found
            <span class="links-count">({{ output.links.length }})</span>
          </summary>
          <ul class="links-list">
            <li v-for="(link, index) in displayedLinks" :key="index">
              <a :href="link" target="_blank" rel="noopener">{{ formatUrl(link) }}</a>
            </li>
            <li v-if="output.links.length > 15" class="more-links">
              ... and {{ output.links.length - 15 }} more links
            </li>
          </ul>
        </details>

        <!-- Error -->
        <div v-if="state === 'output-error' && errorText" class="error-section">
          <div class="error-content">{{ errorText }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ToolState, ScrapeUrlOutput } from '~/types';

const props = defineProps<{
  state: ToolState;
  input?: { url?: string; onlyMainContent?: boolean };
  output?: ScrapeUrlOutput;
  errorText?: string;
}>();

const isExpanded = ref(false);

const isLoading = computed(() => {
  return props.state === 'input-streaming' || props.state === 'input-available';
});

const title = computed(() => {
  if (props.output?.title && props.output.title !== 'Untitled') {
    return props.output.title;
  }
  return 'Fetch URL';
});

const domain = computed(() => {
  const url = props.output?.url || props.input?.url;
  if (!url) return '';
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
});

const truncatedContent = computed(() => {
  const content = props.output?.markdown || '';
  if (content.length <= 2000) return content;
  return content.slice(0, 2000).trim() + '...';
});

const displayedLinks = computed(() => {
  return props.output?.links?.slice(0, 15) || [];
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

const formatUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname !== '/' ? parsed.pathname : '';
    return parsed.hostname + path.slice(0, 50) + (path.length > 50 ? '...' : '');
  } catch {
    return url.slice(0, 60) + (url.length > 60 ? '...' : '');
  }
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

/* URL section */
.url-section {
  padding: 8px 14px;
  border-top: 1px solid #e5e5e5;
  background: #f9fafb;
}

.url-link {
  font-size: 12px;
  color: #006621;
  text-decoration: none;
  word-break: break-all;
  font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
}

.url-link:hover {
  text-decoration: underline;
}

/* Content section */
.content-section {
  padding: 12px 14px;
  border-top: 1px solid #e5e5e5;
}

.section-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 8px;
}

.markdown-content {
  font-size: 13px;
  line-height: 1.6;
  color: #374151;
  background: #f9fafb;
  padding: 12px;
  border-radius: 6px;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Links section */
.links-section {
  padding: 12px 14px;
  border-top: 1px solid #e5e5e5;
}

.links-toggle {
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #171717;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  margin: -4px -8px;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}

.links-toggle:hover {
  background: #f5f5f5;
}

.links-toggle svg {
  transition: transform 0.2s ease;
}

.links-section[open] .links-toggle svg {
  transform: rotate(180deg);
}

.links-count {
  font-weight: 400;
  color: #737373;
  font-size: 12px;
}

.links-list {
  margin: 12px 0 0 0;
  padding: 0 0 0 20px;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.links-list li {
  margin: 6px 0;
  word-break: break-all;
}

.links-list a {
  color: #1a0dab;
  text-decoration: none;
}

.links-list a:hover {
  text-decoration: underline;
}

.more-links {
  color: #737373;
  font-style: italic;
  list-style: none;
  margin-left: -20px;
  margin-top: 8px;
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

<template>
  <div class="tool-row" :class="{ expanded: isExpanded }">
    <div class="tool-row-header" @click="toggleExpanded">
      <div class="tool-row-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="5" r="2" />
          <circle cx="6" cy="12" r="2" />
          <circle cx="18" cy="12" r="2" />
          <circle cx="6" cy="19" r="2" />
          <circle cx="18" cy="19" r="2" />
          <line x1="12" y1="7" x2="6" y2="10" />
          <line x1="12" y1="7" x2="18" y2="10" />
          <line x1="6" y1="14" x2="6" y2="17" />
          <line x1="18" y1="14" x2="18" y2="17" />
        </svg>
      </div>
      <span class="tool-row-description">{{ description }}</span>
      <span v-if="isLoading" class="tool-row-status">Mapping...</span>
      <span v-else-if="urlCount > 0" class="tool-row-meta">{{ urlCount }} URL{{ urlCount !== 1 ? 's' : '' }}</span>
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
        <!-- URL section -->
        <div v-if="input?.url" class="url-section">
          <a :href="input.url" target="_blank" rel="noopener" class="url-link">
            {{ input.url }}
          </a>
        </div>

        <!-- Config info -->
        <div v-if="input" class="config-section">
          <span>Limit: {{ input.limit || 100 }} URLs</span>
          <span v-if="input.search" class="config-filter">
            <span class="config-separator">•</span>
            Filter: "{{ input.search }}"
          </span>
        </div>

        <!-- URLs list -->
        <div v-if="output?.urls && output.urls.length > 0" class="urls-section">
          <a
            v-for="(url, index) in output.urls"
            :key="index"
            :href="url"
            target="_blank"
            rel="noopener"
            class="url-item"
          >
            <svg class="link-icon" width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path
                d="M6.5 3.5H3.5C2.94772 3.5 2.5 3.94772 2.5 4.5V12.5C2.5 13.0523 2.94772 13.5 3.5 13.5H11.5C12.0523 13.5 12.5 13.0523 12.5 12.5V9.5M9.5 2.5H13.5M13.5 2.5V6.5M13.5 2.5L7 9"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            {{ formatUrl(url) }}
          </a>
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
import type { ToolState, MapSiteInput, MapSiteOutput } from '~/types';

const props = defineProps<{
  state: ToolState;
  input?: MapSiteInput;
  output?: MapSiteOutput;
  errorText?: string;
}>();

const isExpanded = ref(false);

const isLoading = computed(() => {
  return props.state === 'input-streaming' || props.state === 'input-available';
});

const description = computed(() => {
  const url = props.input?.url;
  if (!url) return 'Mapping site';
  const domain = getDomain(url);
  return `Mapping ${domain}`;
});

const urlCount = computed(() => {
  return props.output?.urlsFound || 0;
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

const getDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
};

const formatUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname !== '/' ? parsed.pathname : '';
    const fullPath = parsed.hostname + path;
    return fullPath.length > 80 ? fullPath.slice(0, 80) + '...' : fullPath;
  } catch {
    return url.length > 80 ? url.slice(0, 80) + '...' : url;
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

/* Config section */
.config-section {
  padding: 8px 14px;
  border-top: 1px solid #e5e5e5;
  font-size: 12px;
  color: #737373;
}

.config-separator {
  margin: 0 6px;
}

/* URLs section */
.urls-section {
  border-top: 1px solid #e5e5e5;
  max-height: 300px;
  overflow-y: auto;
  padding: 6px 8px;
}

.url-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #1a0dab;
  text-decoration: none;
  word-break: break-all;
  padding: 6px 8px;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}

.url-item:hover {
  background: #f5f5f5;
  text-decoration: underline;
}

.link-icon {
  flex-shrink: 0;
  color: #737373;
}

.url-item:hover .link-icon {
  color: #1a0dab;
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

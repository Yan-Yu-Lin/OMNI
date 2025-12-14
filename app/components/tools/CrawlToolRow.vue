<template>
  <div class="tool-row" :class="{ expanded: isExpanded }">
    <div class="tool-row-header" @click="toggleExpanded">
      <div class="tool-row-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="2" width="8" height="8" rx="1" />
          <rect x="14" y="2" width="8" height="8" rx="1" />
          <rect x="2" y="14" width="8" height="8" rx="1" />
          <rect x="14" y="14" width="8" height="8" rx="1" />
        </svg>
      </div>
      <span class="tool-row-description">{{ description }}</span>
      <span v-if="isLoading" class="tool-row-status">Crawling...</span>
      <span v-else-if="pageCount > 0" class="tool-row-meta">{{ pageCount }} page{{ pageCount !== 1 ? 's' : '' }}</span>
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
          <span>Limit: {{ input.limit || 10 }} pages</span>
          <span class="config-separator">•</span>
          <span>Max depth: {{ input.maxDepth || 2 }}</span>
        </div>

        <!-- Pages list -->
        <div v-if="output?.pages && output.pages.length > 0" class="pages-section">
          <a
            v-for="(page, index) in output.pages"
            :key="index"
            :href="page.url"
            target="_blank"
            rel="noopener noreferrer"
            class="page-item"
          >
            <span class="page-favicon">{{ getDomainInitials(page.url) }}</span>
            <span class="page-title">{{ page.title || 'Untitled' }}</span>
            <span class="page-domain">{{ getDomain(page.url) }}</span>
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
import type { ToolState, CrawlSiteInput, CrawlSiteOutput } from '~/types';

const props = defineProps<{
  state: ToolState;
  input?: CrawlSiteInput;
  output?: CrawlSiteOutput;
  errorText?: string;
}>();

const isExpanded = ref(false);

const isLoading = computed(() => {
  return props.state === 'input-streaming' || props.state === 'input-available';
});

const description = computed(() => {
  const url = props.input?.url;
  if (!url) return 'Crawling site';
  const domain = getDomain(url);
  return `Crawling ${domain}`;
});

const pageCount = computed(() => {
  return props.output?.pagesFound || 0;
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

const getDomainInitials = (url: string): string => {
  const domain = getDomain(url);
  const parts = domain.split('.');
  if (parts[0].length <= 3) {
    return parts[0].toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
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

/* Pages section */
.pages-section {
  border-top: 1px solid #e5e5e5;
  max-height: 300px;
  overflow-y: auto;
  padding: 6px 8px;
}

.page-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 4px;
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.page-item:hover {
  background: #f5f5f5;
}

.page-favicon {
  flex-shrink: 0;
  width: 24px;
  font-size: 11px;
  font-weight: 600;
  color: #666;
  text-align: center;
}

.page-title {
  flex: 1;
  font-size: 13px;
  color: #1a0dab;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.page-domain {
  flex-shrink: 0;
  font-size: 12px;
  color: #999;
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

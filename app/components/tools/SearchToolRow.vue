<template>
  <div class="tool-row" :class="{ expanded: isExpanded }">
    <div class="tool-row-header" @click="toggleExpanded">
      <div class="tool-row-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </div>
      <span class="tool-row-description">{{ query }}</span>
      <span v-if="isLoading" class="tool-row-status">Searching...</span>
      <span v-else-if="resultCount > 0" class="tool-row-meta">{{ resultCount }} results</span>
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

    <div class="tool-row-content" :class="{ open: isExpanded && results.length > 0 }">
      <div class="tool-row-content-inner">
        <div class="search-results">
          <a
            v-for="result in results"
            :key="result.url"
            :href="result.url"
            target="_blank"
            rel="noopener noreferrer"
            class="result-item"
          >
            <img
              :src="getFaviconUrl(result.url)"
              :alt="getDomain(result.url)"
              class="result-favicon"
              @error="handleFaviconError"
            />
            <span class="result-title">{{ result.title || 'Untitled' }}</span>
            <span class="result-domain">{{ getDomain(result.url) }}</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ToolState, WebSearchResult } from '~/types';

const props = defineProps<{
  state: ToolState;
  input?: { query?: string; limit?: number };
  output?: { results?: WebSearchResult[] };
}>();

const isExpanded = ref(false);

const query = computed(() => props.input?.query || '');
const results = computed(() => props.output?.results || []);
const resultCount = computed(() => results.value.length);

const isLoading = computed(() => {
  return props.state === 'input-streaming' || props.state === 'input-available';
});

// Auto-expand when results arrive
watch(
  () => props.state,
  (newState) => {
    if (newState === 'output-available') {
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

const getFaviconUrl = (url: string): string => {
  const domain = getDomain(url);
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
};

const handleFaviconError = (e: Event) => {
  const img = e.target as HTMLImageElement;
  img.style.display = 'none';
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

/* Search results */
.search-results {
  padding: 6px 8px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 4px;
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.result-item:hover {
  background: #f5f5f5;
}

.result-favicon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border-radius: 2px;
  object-fit: contain;
}

.result-title {
  flex: 1;
  font-size: 13px;
  color: #1a0dab;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-domain {
  flex-shrink: 0;
  font-size: 12px;
  color: #999;
}
</style>

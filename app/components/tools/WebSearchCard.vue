<template>
  <div class="web-search-card" :class="{ expanded: isExpanded }">
    <div class="search-header" @click="toggleExpanded">
      <div class="header-left">
        <svg class="globe-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span class="search-query">{{ query }}</span>
      </div>
      <div class="header-right">
        <span v-if="isLoading" class="status-text">Searching...</span>
        <span v-else-if="resultCount > 0" class="result-count">{{ resultCount }} results</span>
        <svg
          class="chevron"
          :class="{ rotated: isExpanded }"
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
    </div>

    <Transition name="expand">
      <div v-if="isExpanded && results.length > 0" class="search-results">
        <a
          v-for="result in results"
          :key="result.url"
          :href="result.url"
          target="_blank"
          rel="noopener noreferrer"
          class="result-item"
        >
          <span class="result-favicon">{{ getDomainInitials(result.url) }}</span>
          <span class="result-title">{{ result.title || 'Untitled' }}</span>
          <span class="result-domain">{{ getDomain(result.url) }}</span>
        </a>
      </div>
    </Transition>
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
.web-search-card {
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  margin: 8px 0;
  overflow: hidden;
  background: #fafafa;
}

.search-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
}

.search-header:hover {
  background: rgba(0, 0, 0, 0.02);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.globe-icon {
  flex-shrink: 0;
  color: #666;
}

.search-query {
  font-size: 14px;
  color: #171717;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.status-text {
  font-size: 12px;
  color: #666;
}

.result-count {
  font-size: 12px;
  color: #666;
}

.chevron {
  color: #999;
  transition: transform 0.2s ease;
}

.chevron.rotated {
  transform: rotate(180deg);
}

.search-results {
  border-top: 1px solid #e5e5e5;
  padding: 6px 8px;
  background: #fff;
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
  width: 24px;
  font-size: 10px;
  font-weight: 600;
  color: #666;
  text-align: center;
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

/* Expand transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>

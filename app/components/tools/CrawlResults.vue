<template>
  <div class="crawl-results">
    <div class="results-header">
      <span class="results-count">Found {{ result.pagesFound }} page{{ result.pagesFound !== 1 ? 's' : '' }}</span>
    </div>

    <div class="results-list">
      <a
        v-for="(page, index) in result.pages"
        :key="index"
        :href="page.url"
        target="_blank"
        rel="noopener noreferrer"
        class="result-item"
      >
        <span class="result-favicon">{{ getDomainInitials(page.url) }}</span>
        <span class="result-title">{{ page.title || 'Untitled' }}</span>
        <span class="result-domain">{{ getDomain(page.url) }}</span>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CrawlSiteOutput } from '~/types';

defineProps<{
  result: CrawlSiteOutput;
}>();

const getDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
};

const getDomainInitials = (url: string): string => {
  const domain = getDomain(url);
  // Get first 2 characters or first letter of each word
  const parts = domain.split('.');
  if (parts[0].length <= 3) {
    return parts[0].toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};
</script>

<style scoped>
.crawl-results {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.results-header {
  padding: 8px 0;
  font-size: 13px;
  color: var(--color-text-secondary, #666);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  margin: 0 -10px;
  border-radius: var(--radius-sm, 4px);
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.result-item:hover {
  background: var(--color-bg-secondary, #f5f5f5);
}

.result-favicon {
  flex-shrink: 0;
  width: 24px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary, #666);
  text-align: center;
}

.result-title {
  flex: 1;
  font-size: 14px;
  color: var(--color-accent-blue, #1a0dab);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-domain {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--color-text-muted, #a0a0a0);
}
</style>

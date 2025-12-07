<template>
  <div class="crawl-results">
    <div class="results-summary">
      Found {{ result.pagesFound }} page{{ result.pagesFound !== 1 ? 's' : '' }}
    </div>

    <div class="pages-list">
      <div
        v-for="(page, index) in result.pages"
        :key="index"
        class="crawl-page"
      >
        <div class="page-header">
          <a :href="page.url" target="_blank" rel="noopener" class="page-title">
            {{ page.title || 'Untitled' }}
          </a>
          <div class="page-url">{{ formatUrl(page.url) }}</div>
        </div>

        <details v-if="page.markdown" class="page-content">
          <summary class="content-toggle">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            View content
            <span class="content-length">({{ formatLength(page.markdown.length) }})</span>
          </summary>
          <div class="markdown-preview">
            {{ truncate(page.markdown, 800) }}
          </div>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CrawlSiteOutput } from '~/types';

defineProps<{
  result: CrawlSiteOutput;
}>();

const formatUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname !== '/' ? parsed.pathname : '';
    return parsed.hostname + path.slice(0, 50) + (path.length > 50 ? '...' : '');
  } catch {
    return url.slice(0, 60) + (url.length > 60 ? '...' : '');
  }
};

const truncate = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

const formatLength = (length: number) => {
  if (length < 1000) return `${length} chars`;
  return `${(length / 1000).toFixed(1)}k chars`;
};
</script>

<style scoped>
.crawl-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.results-summary {
  font-size: 12px;
  color: #737373;
  font-weight: 500;
}

.pages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.crawl-page {
  background: #fff;
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
  transition: border-color 0.15s ease;
}

.crawl-page:hover {
  border-color: #d0d0d0;
}

.page-header {
  margin-bottom: 8px;
}

.page-title {
  font-weight: 600;
  font-size: 14px;
  color: #1a0dab;
  text-decoration: none;
  display: block;
  line-height: 1.4;
}

.page-title:hover {
  text-decoration: underline;
}

.page-url {
  font-size: 12px;
  color: #006621;
  margin-top: 2px;
  word-break: break-all;
  font-family:
    'SF Mono',
    'Menlo',
    'Monaco',
    monospace;
}

.page-content {
  margin-top: 8px;
}

.content-toggle {
  cursor: pointer;
  font-size: 12px;
  color: #525252;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  margin: -4px -8px;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}

.content-toggle:hover {
  background: #f5f5f5;
  color: #171717;
}

.content-toggle svg {
  transition: transform 0.2s ease;
}

.page-content[open] .content-toggle svg {
  transform: rotate(180deg);
}

.content-length {
  font-weight: 400;
  color: #737373;
  font-size: 11px;
}

.markdown-preview {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.6;
  background: #f9fafb;
  padding: 12px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
  color: #525252;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
}
</style>

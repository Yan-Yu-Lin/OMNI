<template>
  <div class="search-results">
    <div class="results-summary">
      Found {{ results.length }} result{{ results.length !== 1 ? 's' : '' }}
    </div>

    <div class="results-list">
      <div
        v-for="(result, index) in results"
        :key="index"
        class="search-result"
      >
        <div class="result-header">
          <a :href="result.url" target="_blank" rel="noopener" class="result-title">
            {{ result.title || 'Untitled' }}
          </a>
          <div class="result-url">{{ formatUrl(result.url) }}</div>
        </div>

        <p v-if="result.description" class="result-description">
          {{ result.description }}
        </p>

        <details v-if="result.markdown" class="result-content">
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
            View page content
          </summary>
          <div class="markdown-preview">
            {{ truncate(result.markdown, 800) }}
          </div>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebSearchResult } from '~/types';

defineProps<{
  results: WebSearchResult[];
}>();

const formatUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '');
  } catch {
    return url;
  }
};

const truncate = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};
</script>

<style scoped>
.search-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.results-summary {
  font-size: 12px;
  color: #737373;
  font-weight: 500;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-result {
  background: #fff;
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
  transition: border-color 0.15s ease;
}

.search-result:hover {
  border-color: #d0d0d0;
}

.result-header {
  margin-bottom: 8px;
}

.result-title {
  font-weight: 600;
  font-size: 14px;
  color: #1a0dab;
  text-decoration: none;
  display: block;
  line-height: 1.4;
}

.result-title:hover {
  text-decoration: underline;
}

.result-url {
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

.result-description {
  font-size: 13px;
  color: #4d4d4d;
  line-height: 1.5;
  margin: 0 0 8px 0;
}

.result-content {
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

.result-content[open] .content-toggle svg {
  transform: rotate(180deg);
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

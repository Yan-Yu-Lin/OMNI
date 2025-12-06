<template>
  <div class="scrape-result">
    <div class="result-header">
      <a :href="result.url" target="_blank" rel="noopener" class="result-title">
        {{ result.title || 'Untitled' }}
      </a>
      <div class="result-url">{{ formatUrl(result.url) }}</div>
    </div>

    <p v-if="result.description" class="result-description">
      {{ result.description }}
    </p>

    <details v-if="result.markdown" class="result-content" open>
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
        Page content
        <span class="content-length">({{ formatLength(result.markdown.length) }})</span>
      </summary>
      <div class="markdown-preview">
        {{ truncate(result.markdown, 1500) }}
      </div>
    </details>

    <details v-if="result.links && result.links.length > 0" class="result-links">
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
        Links found
        <span class="links-count">({{ result.links.length }})</span>
      </summary>
      <ul class="links-list">
        <li v-for="(link, index) in displayedLinks" :key="index">
          <a :href="link" target="_blank" rel="noopener">{{ formatUrl(link) }}</a>
        </li>
        <li v-if="result.links.length > 15" class="more-links">
          ... and {{ result.links.length - 15 }} more links
        </li>
      </ul>
    </details>
  </div>
</template>

<script setup lang="ts">
import type { ScrapeUrlOutput } from '~/types';

const props = defineProps<{
  result: ScrapeUrlOutput;
}>();

const displayedLinks = computed(() => {
  return props.result.links?.slice(0, 15) || [];
});

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
.scrape-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-header {
  background: #fff;
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
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
  margin-top: 4px;
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
  margin: 0;
  padding: 0 4px;
}

.result-content,
.result-links {
  background: #fff;
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
}

.content-toggle {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: #171717;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  margin: -4px -8px;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}

.content-toggle:hover {
  background: #f5f5f5;
}

.content-toggle svg {
  transition: transform 0.2s ease;
}

.result-content[open] .content-toggle svg,
.result-links[open] .content-toggle svg {
  transform: rotate(180deg);
}

.content-length,
.links-count {
  font-weight: 400;
  color: #737373;
  font-size: 12px;
}

.markdown-preview {
  margin-top: 12px;
  font-size: 13px;
  line-height: 1.7;
  background: #f9fafb;
  padding: 16px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 400px;
  overflow-y: auto;
  color: #374151;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
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
</style>

<template>
  <div class="map-results">
    <div class="results-summary">
      Found {{ result.urlsFound }} URL{{ result.urlsFound !== 1 ? 's' : '' }}
    </div>

    <div class="url-list">
      <a
        v-for="(url, index) in result.urls"
        :key="index"
        :href="url"
        target="_blank"
        rel="noopener"
        class="url-item"
      >
        <svg
          class="link-icon"
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
        >
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
  </div>
</template>

<script setup lang="ts">
import type { MapSiteOutput } from '~/types';

defineProps<{
  result: MapSiteOutput;
}>();

const formatUrl = (url: string) => {
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
.map-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.results-summary {
  font-size: 12px;
  color: #737373;
  font-weight: 500;
}

.url-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 300px;
  overflow-y: auto;
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
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
  margin: 0 -8px;
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
</style>

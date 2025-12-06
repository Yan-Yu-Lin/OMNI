# Phase 4: Additional Tools

> Add crawl and map tools to complete the Firecrawl integration.

---

## Prerequisites

- Phase 3 completed
- web_search and scrape_url tools working
- Firecrawl client utility exists

---

## Skills to Load

```
Invoke skill: firecrawl
```

Key documentation:
- `Crawl.md` - Recursive crawling
- `Map.md` - URL discovery

---

## Tasks

### Task 4.1: Add Firecrawl Crawl and Map Functions

**Update `server/utils/firecrawl.ts`** (add to existing file):

```typescript
// ... existing code ...

// Crawl API (async operation)
export async function firecrawlCrawl(
  url: string,
  options: {
    limit?: number;
    maxDepth?: number;
  } = {}
) {
  const config = getFirecrawlConfig();
  const baseUrl = getBaseUrl(config);

  // Start crawl job
  const startResponse = await fetch(`${baseUrl}/v2/crawl`, {
    method: 'POST',
    headers: getHeaders(config),
    body: JSON.stringify({
      url,
      limit: options.limit || 10,
      maxDiscoveryDepth: options.maxDepth || 2,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
      },
    }),
  });

  if (!startResponse.ok) {
    const error = await startResponse.text();
    throw new Error(`Firecrawl crawl failed to start: ${error}`);
  }

  const { id: jobId } = await startResponse.json();

  // Poll for completion (with timeout)
  const maxWaitTime = 60000; // 60 seconds
  const pollInterval = 2000; // 2 seconds
  let elapsed = 0;

  while (elapsed < maxWaitTime) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    elapsed += pollInterval;

    const statusResponse = await fetch(`${baseUrl}/v2/crawl/${jobId}`, {
      headers: getHeaders(config),
    });

    if (!statusResponse.ok) {
      continue; // Retry
    }

    const result = await statusResponse.json();

    if (result.status === 'completed') {
      return result;
    } else if (result.status === 'failed') {
      throw new Error(`Crawl failed: ${result.error || 'Unknown error'}`);
    }
    // else: still running, continue polling
  }

  throw new Error('Crawl timed out after 60 seconds');
}

// Map API (synchronous)
export async function firecrawlMap(
  url: string,
  options: {
    limit?: number;
    search?: string;
  } = {}
) {
  const config = getFirecrawlConfig();
  const baseUrl = getBaseUrl(config);

  const body: any = {
    url,
    limit: options.limit || 100,
  };

  if (options.search) {
    body.search = options.search;
  }

  const response = await fetch(`${baseUrl}/v2/map`, {
    method: 'POST',
    headers: getHeaders(config),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Firecrawl map failed: ${error}`);
  }

  return response.json();
}
```

---

### Task 4.2: Create Crawl Tool

**Create `server/tools/crawl-site.ts`:**

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { firecrawlCrawl } from '../utils/firecrawl';

export const crawlSiteTool = tool({
  description: 'Crawl a website recursively to extract content from multiple pages. Useful for understanding a whole site or section.',
  parameters: z.object({
    url: z.string().url().describe('The starting URL to crawl from'),
    limit: z.number().min(1).max(50).default(10).describe('Maximum number of pages to crawl'),
    maxDepth: z.number().min(1).max(5).default(2).describe('Maximum link depth to follow'),
  }),
  execute: async ({ url, limit, maxDepth }) => {
    try {
      const response = await firecrawlCrawl(url, { limit, maxDepth });

      // Format results
      const pages = (response.data || []).map((item: any) => ({
        url: item.metadata?.sourceURL || item.url,
        title: item.metadata?.title || 'Untitled',
        markdown: item.markdown || '',
      }));

      return {
        pagesFound: pages.length,
        pages,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Crawl failed';
      throw new Error(message);
    }
  },
});
```

---

### Task 4.3: Create Map Tool

**Create `server/tools/map-site.ts`:**

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { firecrawlMap } from '../utils/firecrawl';

export const mapSiteTool = tool({
  description: 'Discover all URLs on a website without scraping content. Fast way to understand site structure.',
  parameters: z.object({
    url: z.string().url().describe('The website URL to map'),
    limit: z.number().min(1).max(500).default(100).describe('Maximum number of URLs to return'),
    search: z.string().optional().describe('Filter URLs containing this text (optional)'),
  }),
  execute: async ({ url, limit, search }) => {
    try {
      const response = await firecrawlMap(url, { limit, search });

      const urls = response.links || response.data || [];

      return {
        urlsFound: urls.length,
        urls: urls.slice(0, limit),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Map failed';
      throw new Error(message);
    }
  },
});
```

---

### Task 4.4: Update Tool Registry

**Update `server/tools/index.ts`:**

```typescript
import { webSearchTool } from './web-search';
import { scrapeUrlTool } from './scrape-url';
import { crawlSiteTool } from './crawl-site';
import { mapSiteTool } from './map-site';

export const tools = {
  web_search: webSearchTool,
  scrape_url: scrapeUrlTool,
  crawl_site: crawlSiteTool,
  map_site: mapSiteTool,
};

export { webSearchTool, scrapeUrlTool, crawlSiteTool, mapSiteTool };
```

---

### Task 4.5: Update System Prompt

**Update `server/api/chat.post.ts`** system prompt:

```typescript
system: `You are a helpful assistant with access to web tools.

Available tools:
- web_search: Search the web for current information. Returns results with full page content.
- scrape_url: Extract content from a specific URL. Use when you know the exact page.
- crawl_site: Crawl a website recursively to get content from multiple pages. Use for understanding a whole site.
- map_site: Discover all URLs on a website without scraping. Fast way to see site structure.

Guidelines:
- Use web_search for general questions needing current info
- Use scrape_url when given a specific URL to read
- Use crawl_site to explore documentation sites or blogs
- Use map_site first if you need to find specific pages on a large site`,
```

---

### Task 4.6: Add Tool Types

**Update `types/index.ts`** (add to existing):

```typescript
// ... existing types ...

export interface CrawlSiteInput {
  url: string;
  limit?: number;
  maxDepth?: number;
}

export interface CrawlPage {
  url: string;
  title: string;
  markdown: string;
}

export interface CrawlSiteOutput {
  pagesFound: number;
  pages: CrawlPage[];
}

export interface MapSiteInput {
  url: string;
  limit?: number;
  search?: string;
}

export interface MapSiteOutput {
  urlsFound: number;
  urls: string[];
}
```

---

### Task 4.7: Create Tool Result Components

**Create `components/tools/CrawlResults.vue`:**

```vue
<template>
  <div class="crawl-results">
    <div class="results-summary">
      Found {{ result.pagesFound }} pages
    </div>

    <div
      v-for="(page, index) in result.pages"
      :key="index"
      class="crawl-page"
    >
      <a :href="page.url" target="_blank" class="page-title">
        {{ page.title }}
      </a>
      <div class="page-url">{{ page.url }}</div>

      <details v-if="page.markdown" class="page-content">
        <summary>View content</summary>
        <div class="markdown-content">
          {{ truncate(page.markdown, 500) }}
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CrawlSiteOutput } from '~/types';

defineProps<{
  result: CrawlSiteOutput;
}>();

const truncate = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};
</script>

<style scoped>
.crawl-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.results-summary {
  font-weight: 600;
  font-size: 14px;
  color: #666;
}

.crawl-page {
  background: #fff;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.page-title {
  font-weight: 600;
  color: #1a0dab;
  text-decoration: none;
  display: block;
  margin-bottom: 4px;
}

.page-title:hover {
  text-decoration: underline;
}

.page-url {
  font-size: 12px;
  color: #006621;
  word-break: break-all;
  margin-bottom: 8px;
}

.page-content summary {
  cursor: pointer;
  font-size: 12px;
  color: #666;
}

.markdown-content {
  margin-top: 8px;
  font-size: 12px;
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}
</style>
```

**Create `components/tools/MapResults.vue`:**

```vue
<template>
  <div class="map-results">
    <div class="results-summary">
      Found {{ result.urlsFound }} URLs
    </div>

    <div class="url-list">
      <a
        v-for="(url, index) in result.urls"
        :key="index"
        :href="url"
        target="_blank"
        class="url-item"
      >
        {{ url }}
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MapSiteOutput } from '~/types';

defineProps<{
  result: MapSiteOutput;
}>();
</script>

<style scoped>
.map-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.results-summary {
  font-weight: 600;
  font-size: 14px;
  color: #666;
}

.url-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 300px;
  overflow-y: auto;
  background: #fff;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.url-item {
  font-size: 13px;
  color: #1a0dab;
  text-decoration: none;
  word-break: break-all;
  padding: 4px 0;
}

.url-item:hover {
  text-decoration: underline;
}

.url-item + .url-item {
  border-top: 1px solid #f0f0f0;
}
</style>
```

---

### Task 4.8: Update Message Component

**Update `components/chat/Message.vue`** to handle new tools:

Add these cases in the template (after scrape_url):

```vue
<!-- Crawl Site tool -->
<ToolCard
  v-else-if="part.type === 'tool-crawl_site'"
  tool-name="crawl_site"
  :state="part.state"
  :input="part.input"
  :output="part.output"
  :error-text="part.errorText"
>
  <template #input="{ input }">
    <div><strong>URL:</strong> {{ input.url }}</div>
    <div><strong>Limit:</strong> {{ input.limit || 10 }} pages</div>
    <div><strong>Max Depth:</strong> {{ input.maxDepth || 2 }}</div>
  </template>
  <template #output="{ output }">
    <CrawlResults :result="output" />
  </template>
</ToolCard>

<!-- Map Site tool -->
<ToolCard
  v-else-if="part.type === 'tool-map_site'"
  tool-name="map_site"
  :state="part.state"
  :input="part.input"
  :output="part.output"
  :error-text="part.errorText"
>
  <template #input="{ input }">
    <div><strong>URL:</strong> {{ input.url }}</div>
    <div v-if="input.search"><strong>Filter:</strong> {{ input.search }}</div>
    <div><strong>Limit:</strong> {{ input.limit || 100 }} URLs</div>
  </template>
  <template #output="{ output }">
    <MapResults :result="output" />
  </template>
</ToolCard>
```

---

## Acceptance Criteria

- [ ] crawl_site tool works and shows progress
- [ ] crawl_site displays multiple pages with content
- [ ] map_site tool returns list of URLs quickly
- [ ] map_site can filter URLs by search term
- [ ] All 4 tools can be used together in conversations
- [ ] Error states handled gracefully

---

## Testing

1. **Test map:**
   - Ask: "Map all URLs on https://example.com"
   - Should see list of URLs

2. **Test crawl:**
   - Ask: "Crawl the documentation at https://docs.example.com and summarize what you find"
   - Should see multiple pages crawled
   - Note: Crawl takes longer due to async nature

3. **Test combined:**
   - Ask: "First map https://example.com to find their blog, then crawl the blog section"
   - Should see multi-step tool usage

---

## Files Created/Modified

```
server/
├── tools/
│   ├── index.ts              # MODIFIED
│   ├── crawl-site.ts         # NEW
│   └── map-site.ts           # NEW
├── utils/
│   └── firecrawl.ts          # MODIFIED
└── api/
    └── chat.post.ts          # MODIFIED (system prompt)

components/
├── chat/
│   └── Message.vue           # MODIFIED
└── tools/
    ├── CrawlResults.vue      # NEW
    └── MapResults.vue        # NEW

types/
└── index.ts                  # MODIFIED
```

---

## Next Phase

Once Phase 4 is complete, proceed to **Phase 5: Conversation Persistence** to save and load conversations.

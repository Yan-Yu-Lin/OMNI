# Phase 3: Tool Infrastructure

> Add tool calling support with transparent UI - the core feature of this project.

---

## Prerequisites

- Phase 2 completed
- Chat works with streaming responses
- OpenRouter API key configured

---

## Skills to Load

Before starting this phase, load these skills for reference:

```
Invoke skill: vercel-ai-sdk
Invoke skill: firecrawl
```

Key documentation to reference:
- Vercel AI SDK: `Tool Calling.md`, `Chatbot Tool Usage.md`
- Firecrawl: `Search.md`, `Scrape.md`

---

## Understanding Tool Parts

The Vercel AI SDK represents tool calls as "parts" in messages. Each tool part has:

- **type**: `tool-{toolName}` (e.g., `tool-web_search`)
- **state**: One of:
  - `input-streaming` - AI is generating tool inputs
  - `input-available` - Inputs ready, tool executing
  - `output-available` - Tool completed with result
  - `output-error` - Tool failed
- **input**: The tool's input parameters
- **output**: The tool's result (when available)

---

## Tasks

### Task 3.1: Create Tool Type Definitions

**Update `types/index.ts`** (add to existing file):

```typescript
// ... existing types ...

// Tool input/output types
export interface WebSearchInput {
  query: string;
  limit?: number;
}

export interface WebSearchResult {
  url: string;
  title: string;
  description: string;
  markdown?: string;
}

export interface WebSearchOutput {
  results: WebSearchResult[];
}

export interface ScrapeUrlInput {
  url: string;
  onlyMainContent?: boolean;
}

export interface ScrapeUrlOutput {
  url: string;
  title: string;
  description: string;
  markdown: string;
  links?: string[];
}

// Tool part type helper
export interface ToolPart<TInput, TOutput> {
  type: string;
  toolCallId: string;
  toolName: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  input?: TInput;
  output?: TOutput;
  errorText?: string;
}
```

---

### Task 3.2: Create Firecrawl Client

**Create `server/utils/firecrawl.ts`:**

```typescript
interface FirecrawlConfig {
  mode: 'self-hosted' | 'cloud';
  selfHostedUrl: string;
  apiKey: string;
}

function getFirecrawlConfig(): FirecrawlConfig {
  const config = useRuntimeConfig();

  // For now, default to self-hosted
  // Settings integration will come in Phase 6
  return {
    mode: 'self-hosted',
    selfHostedUrl: config.firecrawlSelfHostedUrl || 'http://localhost:3002',
    apiKey: config.firecrawlApiKey || '',
  };
}

function getBaseUrl(config: FirecrawlConfig): string {
  if (config.mode === 'self-hosted') {
    return config.selfHostedUrl;
  }
  return 'https://api.firecrawl.dev';
}

function getHeaders(config: FirecrawlConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.mode === 'cloud' && config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  return headers;
}

// Search API
export async function firecrawlSearch(
  query: string,
  options: {
    limit?: number;
    scrapeContent?: boolean;
  } = {}
) {
  const config = getFirecrawlConfig();
  const baseUrl = getBaseUrl(config);

  const response = await fetch(`${baseUrl}/v2/search`, {
    method: 'POST',
    headers: getHeaders(config),
    body: JSON.stringify({
      query,
      limit: options.limit || 5,
      scrapeOptions: options.scrapeContent
        ? { formats: ['markdown'], onlyMainContent: true }
        : undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Firecrawl search failed: ${error}`);
  }

  return response.json();
}

// Scrape API
export async function firecrawlScrape(
  url: string,
  options: {
    formats?: string[];
    onlyMainContent?: boolean;
  } = {}
) {
  const config = getFirecrawlConfig();
  const baseUrl = getBaseUrl(config);

  const response = await fetch(`${baseUrl}/v2/scrape`, {
    method: 'POST',
    headers: getHeaders(config),
    body: JSON.stringify({
      url,
      formats: options.formats || ['markdown'],
      onlyMainContent: options.onlyMainContent ?? true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Firecrawl scrape failed: ${error}`);
  }

  return response.json();
}
```

---

### Task 3.3: Create Tool Definitions

**Create `server/tools/web-search.ts`:**

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { firecrawlSearch } from '../utils/firecrawl';

export const webSearchTool = tool({
  description: 'Search the web for information. Returns search results with full page content.',
  parameters: z.object({
    query: z.string().describe('The search query'),
    limit: z.number().min(1).max(20).default(5).describe('Number of results to return'),
  }),
  execute: async ({ query, limit }) => {
    try {
      const response = await firecrawlSearch(query, {
        limit,
        scrapeContent: true,
      });

      // Format results
      const results = (response.data || []).map((item: any) => ({
        url: item.url,
        title: item.title || item.metadata?.title || 'Untitled',
        description: item.description || item.metadata?.description || '',
        markdown: item.markdown || '',
      }));

      return { results };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed';
      throw new Error(message);
    }
  },
});
```

**Create `server/tools/scrape-url.ts`:**

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { firecrawlScrape } from '../utils/firecrawl';

export const scrapeUrlTool = tool({
  description: 'Extract content from a specific URL. Returns the page content as markdown.',
  parameters: z.object({
    url: z.string().url().describe('The URL to scrape'),
    onlyMainContent: z.boolean().default(true).describe('Whether to exclude navigation and footer'),
  }),
  execute: async ({ url, onlyMainContent }) => {
    try {
      const response = await firecrawlScrape(url, {
        formats: ['markdown', 'links'],
        onlyMainContent,
      });

      const data = response.data || {};

      return {
        url: data.metadata?.sourceURL || url,
        title: data.metadata?.title || 'Untitled',
        description: data.metadata?.description || '',
        markdown: data.markdown || '',
        links: data.links || [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scrape failed';
      throw new Error(message);
    }
  },
});
```

**Create `server/tools/index.ts`:**

```typescript
import { webSearchTool } from './web-search';
import { scrapeUrlTool } from './scrape-url';

// Export all tools as a tools object for streamText
export const tools = {
  web_search: webSearchTool,
  scrape_url: scrapeUrlTool,
};

// Export individual tools for typing
export { webSearchTool, scrapeUrlTool };
```

---

### Task 3.4: Update Chat Endpoint with Tools

**Update `server/api/chat.post.ts`:**

```typescript
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  stepCountIs,
} from 'ai';
import { getOpenRouterClient } from '../utils/openrouter';
import { tools } from '../tools';
import type { ChatRequest } from '~/types';

export default defineEventHandler(async (event) => {
  const body = await readBody<ChatRequest>(event);
  const { messages, model } = body;

  if (!messages || !Array.isArray(messages)) {
    throw createError({
      statusCode: 400,
      message: 'Messages array is required',
    });
  }

  const openrouter = getOpenRouterClient();
  const selectedModel = model || 'anthropic/claude-3.5-sonnet';

  const result = streamText({
    model: openrouter(selectedModel),
    system: `You are a helpful assistant with access to web tools.

Available tools:
- web_search: Search the web for current information
- scrape_url: Extract content from a specific URL

Use these tools when the user asks for information you don't have or when they want to look something up online.`,
    messages: convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(10), // Allow up to 10 tool steps
  });

  return result.toUIMessageStreamResponse();
});
```

---

### Task 3.5: Create Tool UI Components

**Create `components/tools/ToolCard.vue`:**

```vue
<template>
  <div class="tool-card" :class="state">
    <div class="tool-header" @click="toggleExpanded">
      <div class="tool-icon">
        <span v-if="state === 'input-streaming' || state === 'input-available'">
          ⏳
        </span>
        <span v-else-if="state === 'output-available'">✓</span>
        <span v-else-if="state === 'output-error'">✗</span>
      </div>

      <div class="tool-info">
        <span class="tool-name">{{ formatToolName(toolName) }}</span>
        <span class="tool-status">{{ statusText }}</span>
      </div>

      <div class="tool-toggle">
        {{ isExpanded ? '▼' : '▶' }}
      </div>
    </div>

    <div v-if="isExpanded" class="tool-body">
      <div v-if="input" class="tool-section">
        <div class="section-label">Input</div>
        <div class="section-content">
          <slot name="input" :input="input">
            <pre>{{ JSON.stringify(input, null, 2) }}</pre>
          </slot>
        </div>
      </div>

      <div v-if="state === 'output-available' && output" class="tool-section">
        <div class="section-label">Output</div>
        <div class="section-content">
          <slot name="output" :output="output">
            <pre>{{ JSON.stringify(output, null, 2) }}</pre>
          </slot>
        </div>
      </div>

      <div v-if="state === 'output-error' && errorText" class="tool-section error">
        <div class="section-label">Error</div>
        <div class="section-content">{{ errorText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type ToolState = 'input-streaming' | 'input-available' | 'output-available' | 'output-error';

const props = defineProps<{
  toolName: string;
  state: ToolState;
  input?: any;
  output?: any;
  errorText?: string;
}>();

const isExpanded = ref(false);

// Auto-expand on completion or error
watch(() => props.state, (newState) => {
  if (newState === 'output-available' || newState === 'output-error') {
    isExpanded.value = true;
  }
});

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

const formatToolName = (name: string) => {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const statusText = computed(() => {
  switch (props.state) {
    case 'input-streaming':
      return 'Preparing...';
    case 'input-available':
      return 'Running...';
    case 'output-available':
      return 'Complete';
    case 'output-error':
      return 'Failed';
    default:
      return '';
  }
});
</script>

<style scoped>
.tool-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin: 8px 0;
  overflow: hidden;
  background: #fafafa;
}

.tool-card.output-error {
  border-color: #f44336;
  background: #fff5f5;
}

.tool-card.output-available {
  border-color: #4caf50;
}

.tool-header {
  display: flex;
  align-items: center;
  padding: 12px;
  cursor: pointer;
  user-select: none;
}

.tool-header:hover {
  background: #f0f0f0;
}

.tool-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  font-size: 14px;
}

.tool-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tool-name {
  font-weight: 600;
  font-size: 14px;
}

.tool-status {
  font-size: 12px;
  color: #666;
}

.tool-toggle {
  font-size: 12px;
  color: #666;
}

.tool-body {
  border-top: 1px solid #e0e0e0;
}

.tool-section {
  padding: 12px;
}

.tool-section + .tool-section {
  border-top: 1px solid #e0e0e0;
}

.tool-section.error {
  background: #fff5f5;
  color: #c62828;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #666;
  margin-bottom: 8px;
}

.section-content {
  font-size: 13px;
}

.section-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  font-size: 12px;
  background: #fff;
  padding: 8px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}
</style>
```

**Create `components/tools/SearchResults.vue`:**

```vue
<template>
  <div class="search-results">
    <div
      v-for="(result, index) in results"
      :key="index"
      class="search-result"
    >
      <a :href="result.url" target="_blank" class="result-title">
        {{ result.title }}
      </a>
      <div class="result-url">{{ result.url }}</div>
      <div v-if="result.description" class="result-description">
        {{ result.description }}
      </div>
      <details v-if="result.markdown" class="result-content">
        <summary>View content</summary>
        <div class="markdown-content">{{ truncate(result.markdown, 500) }}</div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebSearchResult } from '~/types';

defineProps<{
  results: WebSearchResult[];
}>();

const truncate = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};
</script>

<style scoped>
.search-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-result {
  background: #fff;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.result-title {
  font-weight: 600;
  color: #1a0dab;
  text-decoration: none;
  display: block;
  margin-bottom: 4px;
}

.result-title:hover {
  text-decoration: underline;
}

.result-url {
  font-size: 12px;
  color: #006621;
  margin-bottom: 4px;
  word-break: break-all;
}

.result-description {
  font-size: 13px;
  color: #545454;
  line-height: 1.4;
}

.result-content {
  margin-top: 8px;
}

.result-content summary {
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

**Create `components/tools/ScrapeResult.vue`:**

```vue
<template>
  <div class="scrape-result">
    <div class="result-header">
      <a :href="result.url" target="_blank" class="result-title">
        {{ result.title }}
      </a>
      <div class="result-url">{{ result.url }}</div>
    </div>

    <div v-if="result.description" class="result-description">
      {{ result.description }}
    </div>

    <details v-if="result.markdown" class="result-content" open>
      <summary>Page content</summary>
      <div class="markdown-content">{{ truncate(result.markdown, 1000) }}</div>
    </details>

    <details v-if="result.links && result.links.length > 0" class="result-links">
      <summary>Links found ({{ result.links.length }})</summary>
      <ul>
        <li v-for="(link, index) in result.links.slice(0, 20)" :key="index">
          <a :href="link" target="_blank">{{ link }}</a>
        </li>
        <li v-if="result.links.length > 20">
          ... and {{ result.links.length - 20 }} more
        </li>
      </ul>
    </details>
  </div>
</template>

<script setup lang="ts">
import type { ScrapeUrlOutput } from '~/types';

defineProps<{
  result: ScrapeUrlOutput;
}>();

const truncate = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
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
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.result-title {
  font-weight: 600;
  color: #1a0dab;
  text-decoration: none;
  display: block;
  margin-bottom: 4px;
}

.result-title:hover {
  text-decoration: underline;
}

.result-url {
  font-size: 12px;
  color: #006621;
  word-break: break-all;
}

.result-description {
  font-size: 13px;
  color: #545454;
  line-height: 1.4;
}

.result-content,
.result-links {
  background: #fff;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.result-content summary,
.result-links summary {
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
}

.markdown-content {
  margin-top: 8px;
  font-size: 13px;
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  white-space: pre-wrap;
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.5;
}

.result-links ul {
  margin-top: 8px;
  padding-left: 20px;
  font-size: 12px;
}

.result-links li {
  margin: 4px 0;
  word-break: break-all;
}

.result-links a {
  color: #1a0dab;
}
</style>
```

---

### Task 3.6: Update Message Component for Tool Parts

**Update `components/chat/Message.vue`:**

```vue
<template>
  <div class="message" :class="message.role">
    <div class="message-role">
      {{ message.role === 'user' ? 'You' : 'AI' }}
    </div>
    <div class="message-content">
      <template v-for="(part, index) in message.parts" :key="index">
        <!-- Text parts -->
        <div v-if="part.type === 'text'" class="text-part">
          {{ part.text }}
        </div>

        <!-- Web Search tool -->
        <ToolCard
          v-else-if="part.type === 'tool-web_search'"
          tool-name="web_search"
          :state="part.state"
          :input="part.input"
          :output="part.output"
          :error-text="part.errorText"
        >
          <template #input="{ input }">
            <div><strong>Query:</strong> {{ input.query }}</div>
            <div v-if="input.limit"><strong>Limit:</strong> {{ input.limit }}</div>
          </template>
          <template #output="{ output }">
            <SearchResults :results="output.results" />
          </template>
        </ToolCard>

        <!-- Scrape URL tool -->
        <ToolCard
          v-else-if="part.type === 'tool-scrape_url'"
          tool-name="scrape_url"
          :state="part.state"
          :input="part.input"
          :output="part.output"
          :error-text="part.errorText"
        >
          <template #input="{ input }">
            <div><strong>URL:</strong> {{ input.url }}</div>
          </template>
          <template #output="{ output }">
            <ScrapeResult :result="output" />
          </template>
        </ToolCard>

        <!-- Generic tool fallback -->
        <ToolCard
          v-else-if="part.type.startsWith('tool-')"
          :tool-name="part.type.replace('tool-', '')"
          :state="part.state"
          :input="part.input"
          :output="part.output"
          :error-text="part.errorText"
        />

        <!-- Step start marker (optional) -->
        <div v-else-if="part.type === 'step-start' && index > 0" class="step-divider">
          <hr />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UIMessage } from 'ai';

defineProps<{
  message: UIMessage;
}>();
</script>

<style scoped>
.message {
  padding: 16px 24px;
}

.message.user {
  background: #f5f5f5;
}

.message.assistant {
  background: #fff;
}

.message-role {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  color: #333;
}

.message-content {
  font-size: 15px;
  line-height: 1.6;
  color: #333;
}

.text-part {
  white-space: pre-wrap;
  word-break: break-word;
}

.step-divider {
  margin: 16px 0;
}

.step-divider hr {
  border: none;
  border-top: 1px dashed #ccc;
}
</style>
```

---

## Acceptance Criteria

- [ ] Tools appear in chat when AI decides to use them
- [ ] Tool cards show current state (preparing, running, complete, error)
- [ ] Tool cards are expandable/collapsible
- [ ] Search results display properly with clickable links
- [ ] Scrape results display page content
- [ ] Multi-step tool calls work (AI can call multiple tools in sequence)
- [ ] Errors are displayed gracefully

---

## Testing

1. **Test web search:**
   - Ask: "Search for the latest news about AI"
   - Should see web_search tool called
   - Should see search results displayed

2. **Test scraping:**
   - Ask: "Scrape the content from https://example.com"
   - Should see scrape_url tool called
   - Should see page content displayed

3. **Test multi-step:**
   - Ask: "Search for the OpenAI website and then scrape their about page"
   - Should see multiple tool calls in sequence

4. **Test error handling:**
   - Ask: "Scrape https://definitely-not-a-real-website-12345.com"
   - Should see error state in tool card

---

## Files Created/Modified

```
types/
└── index.ts                    # MODIFIED (added tool types)

server/
├── api/
│   └── chat.post.ts            # MODIFIED (added tools)
├── tools/
│   ├── index.ts                # NEW
│   ├── web-search.ts           # NEW
│   └── scrape-url.ts           # NEW
└── utils/
    └── firecrawl.ts            # NEW

components/
├── chat/
│   └── Message.vue             # MODIFIED (tool rendering)
└── tools/
    ├── ToolCard.vue            # NEW
    ├── SearchResults.vue       # NEW
    └── ScrapeResult.vue        # NEW
```

---

## Next Phase

Once Phase 3 is complete, proceed to **Phase 4: Additional Tools** to add crawl and map tools.

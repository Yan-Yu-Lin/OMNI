# AI Chat Interface - Master Plan

> A self-hosted AI chat interface with transparent, interleaved tool calling.

---

## Project Vision

Build a chat interface where users can:
- Chat with AI models (streaming responses)
- See tool calls happen transparently (not hidden behind loading screens)
- Switch between any AI model via OpenRouter
- Use web tools (search, scrape, crawl, map) via Firecrawl
- Save and continue conversations
- Configure settings (system prompt, temperature, etc.)

**Core Philosophy:** Transparency over convenience. Users see the entire process — text, tool calls, tool results — as it happens.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Frontend (Vue 3 + Nuxt)                                          │  │
│  │                                                                   │  │
│  │  ┌─────────────┐  ┌─────────────────────────────────────────────┐ │  │
│  │  │  Sidebar    │  │  Chat Area                                  │ │  │
│  │  │             │  │                                             │ │  │
│  │  │ - Conv list │  │  Messages with parts:                       │ │  │
│  │  │ - New chat  │  │  - Text (streaming)                         │ │  │
│  │  │             │  │  - Tool calls (expandable)                  │ │  │
│  │  │             │  │  - Tool results (expandable)                │ │  │
│  │  │             │  │                                             │ │  │
│  │  └─────────────┘  └─────────────────────────────────────────────┘ │  │
│  │                                                                   │  │
│  │  Pages: / (chat), /chat/[id], /settings, /models                  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP (streaming)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SERVER (Nitro)                                  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  API Routes                                                     │    │
│  │                                                                 │    │
│  │  POST /api/chat          → streamText + tools + OpenRouter      │    │
│  │  GET  /api/conversations → list conversations                   │    │
│  │  POST /api/conversations → create conversation                  │    │
│  │  GET  /api/conversations/:id → get with messages                │    │
│  │  PUT  /api/conversations/:id → update (title, etc.)             │    │
│  │  DELETE /api/conversations/:id → delete                         │    │
│  │  GET  /api/settings      → get all settings                     │    │
│  │  PUT  /api/settings      → update settings                      │    │
│  │  GET  /api/models        → fetch from OpenRouter                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─────────────────────┐  ┌─────────────────────────────────────────┐   │
│  │  Database (SQLite)  │  │  Tools                                  │   │
│  │                     │  │                                         │   │
│  │  - conversations    │  │  - web_search (Firecrawl)               │   │
│  │  - messages         │  │  - scrape_url (Firecrawl)               │   │
│  │  - settings         │  │  - crawl_site (Firecrawl)               │   │
│  │                     │  │  - map_site (Firecrawl)                 │   │
│  └─────────────────────┘  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────────┐
        │    OpenRouter     │           │      Firecrawl        │
        │                   │           │                       │
        │  - Claude         │           │  Mode: Self-hosted    │
        │  - GPT-4          │           │    OR Cloud API       │
        │  - Gemini         │           │                       │
        │  - Llama          │           │  - /v2/search         │
        │  - 400+ models    │           │  - /v2/scrape         │
        └───────────────────┘           │  - /v2/crawl          │
                                        │  - /v2/map            │
                                        └───────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Nuxt 3 | Full-stack Vue framework |
| Frontend | Vue 3 + TypeScript | Reactive UI components |
| Backend | Nitro (built into Nuxt) | API routes, server logic |
| AI Integration | Vercel AI SDK (`ai`, `@ai-sdk/vue`) | Streaming, tool calling, chat state |
| Model Access | OpenRouter (`@openrouter/ai-sdk-provider`) | Access to 400+ AI models |
| Web Tools | Firecrawl (self-hosted or cloud) | Search, scrape, crawl, map |
| Database | SQLite (`better-sqlite3`) | Local data storage |
| Validation | Zod | Schema validation for tools |
| Package Manager | pnpm | Fast, efficient |

---

## File Structure

```
ai-chat/
├── server/
│   ├── api/
│   │   ├── chat.post.ts                    # Main chat endpoint (streaming)
│   │   ├── conversations/
│   │   │   ├── index.get.ts                # List conversations
│   │   │   ├── index.post.ts               # Create conversation
│   │   │   ├── [id].get.ts                 # Get conversation with messages
│   │   │   ├── [id].put.ts                 # Update conversation
│   │   │   └── [id].delete.ts              # Delete conversation
│   │   ├── settings/
│   │   │   ├── index.get.ts                # Get settings
│   │   │   └── index.put.ts                # Update settings
│   │   └── models/
│   │       └── index.get.ts                # Fetch models from OpenRouter
│   │
│   ├── db/
│   │   ├── index.ts                        # Database connection
│   │   ├── schema.ts                       # Table definitions
│   │   └── migrations/                     # Schema migrations (if needed)
│   │
│   ├── tools/
│   │   ├── index.ts                        # Tool registry (exports all tools)
│   │   ├── web-search.ts                   # Firecrawl search tool
│   │   ├── scrape-url.ts                   # Firecrawl scrape tool
│   │   ├── crawl-site.ts                   # Firecrawl crawl tool
│   │   └── map-site.ts                     # Firecrawl map tool
│   │
│   └── utils/
│       ├── firecrawl.ts                    # Firecrawl client (dual mode)
│       └── openrouter.ts                   # OpenRouter client setup
│
├── pages/
│   ├── index.vue                           # New conversation page
│   ├── chat/
│   │   └── [id].vue                        # Existing conversation page
│   ├── settings.vue                        # Settings page
│   └── models.vue                          # Model selection page
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.vue                   # Main layout wrapper
│   │   ├── Sidebar.vue                     # Left sidebar
│   │   └── Header.vue                      # Top header (if needed)
│   │
│   ├── chat/
│   │   ├── Container.vue                   # Chat container
│   │   ├── MessageList.vue                 # Scrollable message list
│   │   ├── Message.vue                     # Single message (user/assistant)
│   │   ├── MessagePart.vue                 # Renders a single part (text/tool)
│   │   ├── Input.vue                       # Message input with send button
│   │   └── StreamingIndicator.vue          # Shows when AI is responding
│   │
│   ├── tools/
│   │   ├── ToolCard.vue                    # Expandable tool call card
│   │   ├── ToolInput.vue                   # Displays tool input (collapsible)
│   │   ├── ToolOutput.vue                  # Displays tool output (collapsible)
│   │   ├── SearchResults.vue               # Formatted search results
│   │   ├── ScrapeResult.vue                # Formatted scraped content
│   │   ├── CrawlResults.vue                # Formatted crawl results
│   │   └── MapResults.vue                  # Formatted map results
│   │
│   ├── sidebar/
│   │   ├── ConversationList.vue            # List of conversations
│   │   ├── ConversationItem.vue            # Single conversation item
│   │   └── NewChatButton.vue               # Button to start new chat
│   │
│   ├── settings/
│   │   ├── GeneralSettings.vue             # System prompt, temperature
│   │   ├── ModelSettings.vue               # Current model display/change
│   │   ├── FirecrawlSettings.vue           # Firecrawl mode toggle
│   │   └── ApiKeySettings.vue              # API key management
│   │
│   └── models/
│       ├── ModelGrid.vue                   # Grid of model cards
│       ├── ModelCard.vue                   # Single model card
│       └── ModelFilters.vue                # Filter by provider, capability
│
├── composables/
│   ├── useAppChat.ts                       # Wraps @ai-sdk/vue Chat class
│   ├── useConversations.ts                 # Conversation CRUD operations
│   ├── useSettings.ts                      # Settings read/write
│   └── useModels.ts                        # Model fetching and selection
│
├── types/
│   ├── index.ts                            # Main type exports
│   ├── conversation.ts                     # Conversation types
│   ├── settings.ts                         # Settings types
│   ├── tools.ts                            # Tool input/output types
│   └── models.ts                           # Model types
│
├── assets/
│   └── css/
│       └── main.css                        # Global styles
│
├── public/
│   └── favicon.ico
│
├── data/
│   └── .gitkeep                            # SQLite DB stored here
│
├── .env.example                            # Environment template
├── nuxt.config.ts                          # Nuxt configuration
├── package.json
├── tsconfig.json
└── docker-compose.yml                      # Firecrawl services (optional)
```

---

## Database Schema

### conversations
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key (UUID) |
| title | TEXT | Conversation title |
| model | TEXT | Model used (e.g., "anthropic/claude-3.5-sonnet") |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

### messages
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key (UUID) |
| conversation_id | TEXT | Foreign key → conversations |
| role | TEXT | 'user' / 'assistant' |
| content | TEXT | Full message content (JSON for parts) |
| created_at | DATETIME | Creation timestamp |

### settings
| Column | Type | Description |
|--------|------|-------------|
| key | TEXT | Setting key (primary) |
| value | TEXT | Setting value (JSON) |
| updated_at | DATETIME | Last update timestamp |

---

## Settings Structure

```typescript
interface Settings {
  // Model settings
  model: string;                    // e.g., "anthropic/claude-3.5-sonnet"
  systemPrompt: string;             // System instruction
  temperature: number;              // 0-2
  maxTokens: number;                // Max response tokens

  // Firecrawl settings
  firecrawlMode: 'self-hosted' | 'cloud';
  firecrawlSelfHostedUrl: string;   // e.g., "http://localhost:3002"
  firecrawlApiKey: string;          // For cloud mode

  // UI settings (optional)
  theme: 'light' | 'dark' | 'system';
}
```

---

## Tool Definitions

### web_search
```typescript
{
  name: 'web_search',
  description: 'Search the web for information. Returns full page content from results.',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    limit: z.number().min(1).max(20).default(5).describe('Number of results'),
  }),
  // Returns: Array of { url, title, description, markdown }
}
```

### scrape_url
```typescript
{
  name: 'scrape_url',
  description: 'Extract content from a specific URL.',
  inputSchema: z.object({
    url: z.string().url().describe('URL to scrape'),
    onlyMainContent: z.boolean().default(true).describe('Exclude nav/footer'),
  }),
  // Returns: { url, title, description, markdown, links }
}
```

### crawl_site
```typescript
{
  name: 'crawl_site',
  description: 'Crawl a website recursively to extract content from multiple pages.',
  inputSchema: z.object({
    url: z.string().url().describe('Starting URL'),
    limit: z.number().min(1).max(50).default(10).describe('Max pages to crawl'),
    maxDepth: z.number().min(1).max(5).default(2).describe('Max link depth'),
  }),
  // Returns: Array of { url, title, markdown }
}
```

### map_site
```typescript
{
  name: 'map_site',
  description: 'Discover all URLs on a website without scraping content.',
  inputSchema: z.object({
    url: z.string().url().describe('Website URL'),
    limit: z.number().min(1).max(500).default(100).describe('Max URLs'),
    search: z.string().optional().describe('Filter URLs containing this text'),
  }),
  // Returns: Array of URLs
}
```

---

## Implementation Phases

### Phase 1: Project Foundation
Set up the project structure, dependencies, and basic configuration.

**Tasks:**
- 1.1: Initialize Nuxt 3 project with TypeScript
- 1.2: Install dependencies (ai, @ai-sdk/vue, @openrouter/ai-sdk-provider, better-sqlite3, zod)
- 1.3: Set up folder structure
- 1.4: Create base layout components (AppLayout, Sidebar skeleton)
- 1.5: Set up SQLite database connection and schema

### Phase 2: Core Chat (No Tools)
Get basic chat working with streaming responses.

**Tasks:**
- 2.1: Create OpenRouter client utility
- 2.2: Create chat API endpoint (POST /api/chat) with streaming
- 2.3: Create chat UI components (Container, MessageList, Message, Input)
- 2.4: Create useAppChat composable wrapping @ai-sdk/vue Chat class
- 2.5: Wire up frontend to backend, verify streaming works

### Phase 3: Tool Infrastructure
Add tool calling support with transparent UI.

**Tasks:**
- 3.1: Create tool type definitions
- 3.2: Create Firecrawl client utility (dual mode support)
- 3.3: Implement web_search tool
- 3.4: Implement scrape_url tool
- 3.5: Add tools to chat endpoint with multi-step support (stopWhen)
- 3.6: Create ToolCard component (expandable)
- 3.7: Create tool-specific result components (SearchResults, ScrapeResult)
- 3.8: Update MessagePart to render tool parts with states

### Phase 4: Additional Tools
Add crawl and map tools.

**Tasks:**
- 4.1: Implement crawl_site tool
- 4.2: Implement map_site tool
- 4.3: Create CrawlResults and MapResults components
- 4.4: Test all tools together

### Phase 5: Conversation Persistence
Save and load conversations.

**Tasks:**
- 5.1: Create conversation API routes (CRUD)
- 5.2: Create useConversations composable
- 5.3: Update chat to save messages on completion
- 5.4: Create sidebar ConversationList and ConversationItem components
- 5.5: Create /chat/[id] page to load existing conversations
- 5.6: Implement auto-title generation (use AI to summarize first exchange)

### Phase 6: Settings
Add settings page and configuration.

**Tasks:**
- 6.1: Create settings API routes
- 6.2: Create useSettings composable
- 6.3: Create settings page with GeneralSettings, FirecrawlSettings
- 6.4: Wire settings into chat (use selected model, system prompt, etc.)

### Phase 7: Model Selection
Add model browsing and selection.

**Tasks:**
- 7.1: Create models API route (fetch from OpenRouter)
- 7.2: Create useModels composable
- 7.3: Create models page with ModelGrid, ModelCard, ModelFilters
- 7.4: Add model selection to settings
- 7.5: Filter models by tool support capability

### Phase 8: Polish
Final improvements and testing.

**Tasks:**
- 8.1: Add error handling throughout
- 8.2: Add loading states and skeleton UI
- 8.3: Responsive design for mobile
- 8.4: Final testing and bug fixes

---

## Key Implementation Details

### Vercel AI SDK + Vue Pattern

```typescript
// composables/useAppChat.ts
import { Chat } from '@ai-sdk/vue';

export function useAppChat(conversationId?: string) {
  const chat = new Chat({
    api: '/api/chat',
    id: conversationId,
    // initial messages loaded from DB if conversationId provided
  });

  return {
    messages: chat.messages,
    sendMessage: chat.sendMessage,
    status: chat.status,
    // ... other properties
  };
}
```

### Streaming Chat Endpoint

```typescript
// server/api/chat.post.ts
import { streamText, UIMessage, convertToModelMessages, stepCountIs } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { tools } from '../tools';

export default defineEventHandler(async (event) => {
  const { messages, model } = await readBody(event);
  const settings = await getSettings();

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const result = streamText({
    model: openrouter(model || settings.model),
    system: settings.systemPrompt,
    messages: convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(10), // Allow up to 10 tool steps
  });

  return result.toUIMessageStreamResponse();
});
```

### Transparent Tool UI

```vue
<!-- components/chat/MessagePart.vue -->
<template>
  <div v-if="part.type === 'text'">
    <MarkdownRenderer :content="part.text" />
  </div>

  <ToolCard
    v-else-if="part.type.startsWith('tool-')"
    :tool-name="getToolName(part.type)"
    :state="part.state"
    :input="part.input"
    :output="part.output"
  />
</template>
```

### Tool States

The tool UI should handle 4 states:
1. `input-streaming` - Tool input being generated → Show "Preparing..."
2. `input-available` - Input ready, executing → Show input, "Running..."
3. `output-available` - Complete → Show input + output (collapsible)
4. `output-error` - Failed → Show error message

---

## Skills Reference

When implementing specific phases, load these skills for up-to-date documentation:

| Phase | Skills to Load |
|-------|---------------|
| Phase 2-3 (Chat + Tools) | `vercel-ai-sdk`, `openrouter` |
| Phase 3-4 (Firecrawl Tools) | `firecrawl` |
| Phase 7 (Models) | `openrouter` |

**How to load a skill:**
Tell the Claude Code session to "invoke the skill: {skill-name}" before starting work.

---

## Environment Variables

```env
# .env
OPENROUTER_API_KEY=sk-or-...

# Firecrawl (self-hosted mode)
FIRECRAWL_SELF_HOSTED_URL=http://localhost:3002

# Firecrawl (cloud mode)
FIRECRAWL_API_KEY=fc-...
FIRECRAWL_API_URL=https://api.firecrawl.dev
```

---

## Task Files

Individual task files will be created at:
```
.claude/tasks/
├── phase-1-foundation.md
├── phase-2-core-chat.md
├── phase-3-tool-infrastructure.md
├── phase-4-additional-tools.md
├── phase-5-persistence.md
├── phase-6-settings.md
├── phase-7-models.md
└── phase-8-polish.md
```

Each task file contains:
- Prerequisites (what must exist before starting)
- Detailed implementation steps
- Files to create/modify
- Skills to load
- Acceptance criteria
- Testing instructions

---

## Success Criteria for v1.0

- [ ] Can start new conversation
- [ ] Messages stream in real-time
- [ ] Can see tool calls as they happen (expandable cards)
- [ ] web_search tool works
- [ ] scrape_url tool works
- [ ] crawl_site tool works
- [ ] map_site tool works
- [ ] Conversations persist to database
- [ ] Can load previous conversations
- [ ] Can switch between AI models
- [ ] Can configure system prompt and temperature
- [ ] Can toggle Firecrawl mode (self-hosted/cloud)
- [ ] Model selection page shows available models

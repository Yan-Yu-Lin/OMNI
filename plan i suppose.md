# Project Context: AI Chat Interface

> This document provides context for AI assistants (specifically Claude Code) working on this project. It describes what we're building, the core philosophy, and the technical decisions made.

---

## What We're Building

A self-hosted AI chat interface with **transparent, interleaved tool calling** — inspired by how Anthropic handles tool calling in Claude's interface.

The key difference from most chat interfaces:
- **NOT**: AI decides to use tools → tools run in background → user sees final response
- **YES**: AI speaks → uses tool (visible) → sees result (visible) → continues speaking → uses another tool → ... everything is transparent

Users should see the entire process, not just the final output.

---

## Core Philosophy

### Transparency Over Convenience

Most AI chat interfaces hide tool execution behind loading screens. We believe:
- Users should see what tools are being called
- Users should see tool results
- Users should see AI reasoning between tool calls
- There is no "final response" — the entire stream IS the response

### Interleaved Execution

The AI should be able to:
1. Start talking
2. Decide to use a tool mid-response
3. See the tool result
4. Continue talking based on the result
5. Use another tool if needed
6. Repeat as many times as necessary

This is how Claude Code works, and this is what we want.

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Framework** | Nuxt 3 | Vue full-stack framework, integrates frontend + backend |
| **Frontend** | Vue 3 + TypeScript | Reactive UI, familiar ecosystem |
| **Backend** | Nitro (built into Nuxt) | File-based routing, runs anywhere |
| **AI Integration** | Vercel AI SDK | Handles streaming, tool calling state, multi-step execution |
| **Model Access** | OpenRouter + `@openrouter/ai-sdk-provider` | Single API for 300+ models |
| **Web Search/Scraping** | Firecrawl (self-hosted via Docker) | Custom tool for web capabilities |
| **Database** | SQLite (via `better-sqlite3` or Drizzle) | Lightweight, zero-config, local file |
| **Package Manager** | pnpm | Fast, disk-efficient |

---

## Key Dependencies

```json
{
  "dependencies": {
    "nuxt": "^3.x",
    "vue": "^3.x",
    "ai": "^4.x",
    "@ai-sdk/vue": "^1.x",
    "@openrouter/ai-sdk-provider": "^1.x",
    "zod": "^3.x",
    "better-sqlite3": "^11.x"
  }
}
```

---

## Features

### 1. Chat Interface
- Real-time streaming responses
- Visible tool calling process (not hidden)
- Interleaved text and tool execution
- Markdown rendering for responses

### 2. Conversation Management
- Save conversation history
- List past conversations
- Load/continue previous conversations
- Delete conversations
- Auto-generate conversation titles

### 3. Settings Page
- **Model selection**: Switch between models via OpenRouter (Claude, GPT-4, Llama, etc.)
- **System instruction**: Customizable system prompt
- **Temperature**: Adjustable creativity/randomness
- **Other parameters**: max_tokens, top_p, etc.
- Settings should persist (SQLite or JSON file)

### 4. Tools
Initial tools to implement:
- `web_search`: Search the web via Firecrawl
- `scrape_url`: Extract content from a specific URL via Firecrawl

Tools should be:
- Defined using Zod schemas
- Registered with Vercel AI SDK's `tool()` function
- Easily extensible (add more tools later)

---

## Project Structure

```
ai-chat/
├── server/
│   ├── api/
│   │   ├── chat.post.ts              # Main chat endpoint (streaming)
│   │   ├── conversations/
│   │   │   ├── index.get.ts          # List conversations
│   │   │   ├── index.post.ts         # Create conversation
│   │   │   ├── [id].get.ts           # Get single conversation
│   │   │   ├── [id].put.ts           # Update conversation
│   │   │   └── [id].delete.ts        # Delete conversation
│   │   └── settings/
│   │       ├── index.get.ts          # Get settings
│   │       └── index.put.ts          # Update settings
│   │
│   ├── db/
│   │   ├── index.ts                  # Database connection
│   │   └── schema.ts                 # Table definitions
│   │
│   └── tools/
│       ├── index.ts                  # Tool registry
│       ├── web-search.ts             # Firecrawl search
│       └── scrape-url.ts             # Firecrawl scrape
│
├── pages/
│   ├── index.vue                     # Main chat page
│   ├── chat/
│   │   └── [id].vue                  # Specific conversation
│   └── settings.vue                  # Settings page
│
├── components/
│   ├── chat/
│   │   ├── Container.vue             # Main chat container
│   │   ├── MessageList.vue           # List of messages
│   │   ├── Message.vue               # Single message (user or assistant)
│   │   ├── ToolCall.vue              # Render tool invocation (visible!)
│   │   ├── ToolResult.vue            # Render tool result (visible!)
│   │   └── Input.vue                 # Message input
│   │
│   ├── sidebar/
│   │   ├── Sidebar.vue               # Conversation list sidebar
│   │   └── ConversationItem.vue      # Single conversation in list
│   │
│   └── settings/
│       ├── ModelSelect.vue           # Model dropdown
│       ├── SystemPrompt.vue          # System instruction textarea
│       └── ParameterSliders.vue      # Temperature, etc.
│
├── composables/
│   ├── useChat.ts                    # Wraps @ai-sdk/vue useChat
│   ├── useConversations.ts           # Conversation CRUD
│   └── useSettings.ts                # Settings management
│
├── types/
│   └── index.ts                      # Shared TypeScript types
│
├── data/
│   └── .gitkeep                      # SQLite DB will be here
│
├── docker-compose.yml                # Firecrawl
├── nuxt.config.ts
├── package.json
└── tsconfig.json
```

---

## Database Schema

### conversations
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (UUID) | Primary key |
| title | TEXT | Conversation title (auto-generated or manual) |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

### messages
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (UUID) | Primary key |
| conversation_id | TEXT | Foreign key → conversations |
| role | TEXT | 'user' / 'assistant' / 'system' / 'tool' |
| content | TEXT | Message content |
| tool_calls | TEXT (JSON) | Tool call data if any |
| tool_result | TEXT (JSON) | Tool result if this is a tool message |
| created_at | DATETIME | Creation timestamp |

### settings
| Column | Type | Description |
|--------|------|-------------|
| key | TEXT | Setting key (primary) |
| value | TEXT (JSON) | Setting value |

---

## API Endpoints

### Chat
- `POST /api/chat` — Send message, receive streaming response

### Conversations
- `GET /api/conversations` — List all conversations
- `POST /api/conversations` — Create new conversation
- `GET /api/conversations/:id` — Get conversation with messages
- `PUT /api/conversations/:id` — Update conversation (title, etc.)
- `DELETE /api/conversations/:id` — Delete conversation

### Settings
- `GET /api/settings` — Get all settings
- `PUT /api/settings` — Update settings

---

## Settings Structure

```typescript
interface Settings {
  model: string;              // e.g., "anthropic/claude-sonnet-4-20250514"
  systemPrompt: string;       // System instruction
  temperature: number;        // 0-2
  maxTokens: number;          // Max response tokens
  topP: number;               // Top-p sampling
}
```

Default settings:
```json
{
  "model": "anthropic/claude-sonnet-4-20250514",
  "systemPrompt": "You are a helpful assistant.",
  "temperature": 1,
  "maxTokens": 4096,
  "topP": 1
}
```

---

## Important Implementation Notes

### Streaming with Tool Calls

The key to transparent tool calling is using Vercel AI SDK's streaming properly:

```typescript
// server/api/chat.post.ts
import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const result = await streamText({
  model: openrouter(settings.model),
  messages,
  tools: {
    web_search: webSearchTool,
    scrape_url: scrapeUrlTool,
  },
  maxSteps: 10,  // Allow multiple tool calls in one response
});

return result.toDataStreamResponse();
```

The `maxSteps` parameter is crucial — it allows the AI to:
1. Generate text
2. Call a tool
3. See the result
4. Generate more text
5. Call another tool
6. ... repeat up to maxSteps times

### Frontend Rendering

The frontend must render ALL parts of the stream:
- Text chunks → render as markdown
- Tool calls → render as visible "tool invocation" UI
- Tool results → render as visible "tool result" UI

Use `@ai-sdk/vue`'s `useChat` and iterate through message parts.

---

## Docker Setup (Firecrawl)

```yaml
# docker-compose.yml
services:
  firecrawl:
    image: mendableai/firecrawl:latest
    ports:
      - "3002:3002"
    environment:
      - FIRECRAWL_API_KEY=local-dev-key
```

Run with: `docker-compose up -d`

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Start Firecrawl
docker-compose up -d

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

---

## Environment Variables

```env
# .env
OPENROUTER_API_KEY=your-openrouter-api-key
FIRECRAWL_API_URL=http://localhost:3002
```

---

## Non-Goals (For Now)

Things we're NOT building in the initial version:
- User authentication / multi-user support
- Cloud deployment (it's self-hosted)
- File upload handling
- Image generation
- Voice input/output

These can be added later if needed.

---

## References

- [Vercel AI SDK Docs](https://ai-sdk.dev/docs/introduction)
- [Vercel AI SDK - Vue Integration](https://ai-sdk.dev/docs/getting-started/vue)
- [OpenRouter Docs](https://openrouter.ai/docs/quickstart)
- [OpenRouter AI SDK Provider](https://github.com/OpenRouterTeam/ai-sdk-provider)
- [Nuxt 3 Docs](https://nuxt.com/docs)
- [Firecrawl](https://github.com/mendableai/firecrawl)

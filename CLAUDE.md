# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI chat application built with Nuxt 4 featuring real-time streaming, web research tools, and persistent conversations. Uses OpenRouter for LLM access and Firecrawl for web content extraction.

**Tech Stack:** Vue 3 + Nuxt 4, Vercel AI SDK (`ai` 6.0.0-beta), SQLite (better-sqlite3), TypeScript strict mode

## Commands

```bash
npm run dev       # Development server at http://localhost:3000
npm run build     # Production build
npm run preview   # Preview production build
```

## Environment Variables

```bash
NUXT_OPENROUTER_API_KEY      # Required - OpenRouter API key
NUXT_FIRECRAWL_API_KEY       # Optional - Firecrawl cloud API key
NUXT_FIRECRAWL_SELF_HOSTED_URL  # Optional - defaults to http://localhost:3002
```

## Architecture

### Streaming Pipeline

The core streaming flow in `server/api/chat.post.ts`:
1. `streamText()` generates AI response
2. `toUIMessageStreamResponse({ consumeSseStream })` tees the stream - browser gets one copy, server consumes another (survives browser disconnect)
3. `onFinish` callback saves complete response to SQLite
4. `onStepFinish` saves tool results incrementally

**Client-side caveat:** The chat page (`app/pages/chat/[id].vue`) accesses undocumented SDK internals via `(chat as any).state.messagesRef` for instant reactivity. If this breaks after SDK updates, see `docs/STREAMING-ARCHITECTURE.md` for fallback approaches.

### Database

SQLite with WAL mode, stored at `data/chat.db`. Three tables:
- `conversations` - metadata + status (idle|streaming|error)
- `messages` - content stored as JSON strings
- `settings` - user preferences

Migrations auto-run in `server/db/index.ts`.

### Web Tools

Four Firecrawl-powered tools defined in `server/tools/`:
- `web_search` - Search + optional content scraping
- `scrape_url` - Single URL extraction
- `crawl_site` - Recursive crawling
- `map_site` - URL discovery

Tools are registered in `server/tools/index.ts` and described in the system prompt in `server/api/chat.post.ts`.

## Key Files

| Purpose | Location |
|---------|----------|
| Core streaming endpoint | `server/api/chat.post.ts` |
| Chat page + SDK integration | `app/pages/chat/[id].vue` |
| Conversation CRUD | `app/composables/useConversations.ts` |
| Database setup | `server/db/index.ts` |
| Type definitions | `app/types/index.ts` |
| Tool implementations | `server/tools/*.ts` |

## Common Modifications

- **Change default model:** `server/api/chat.post.ts` around line 86
- **Add new tool:** Create in `server/tools/`, export from `server/tools/index.ts`, update system prompt
- **Database schema:** Add migration in `server/db/index.ts`

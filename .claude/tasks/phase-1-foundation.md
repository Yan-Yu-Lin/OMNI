# Phase 1: Project Foundation

> Set up the project structure, dependencies, and basic configuration.

---

## Prerequisites

- Node.js 18+ installed
- pnpm installed
- Working directory: `Chat-Interface/`

---

## Skills to Load

None required for this phase (standard Nuxt setup).

---

## Tasks

### Task 1.1: Initialize Nuxt 3 Project

**Create a new Nuxt 3 project with TypeScript.**

```bash
pnpm create nuxt ai-chat
cd ai-chat
```

When prompted:
- Package manager: pnpm
- Initialize git: No (we'll handle this)

After creation, move contents to project root if needed.

**Verify:**
```bash
pnpm dev
# Should start on http://localhost:3000
```

---

### Task 1.2: Install Dependencies

**Install all required packages:**

```bash
# AI SDK (use beta for v5 features)
pnpm add ai@beta @ai-sdk/vue@beta

# OpenRouter provider
pnpm add @openrouter/ai-sdk-provider

# Database
pnpm add better-sqlite3
pnpm add -D @types/better-sqlite3

# Validation
pnpm add zod

# Utilities
pnpm add nanoid
```

**Update `nuxt.config.ts`:**

```typescript
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  typescript: {
    strict: true,
  },

  runtimeConfig: {
    // Server-only (not exposed to client)
    openrouterApiKey: '',
    firecrawlApiKey: '',
    firecrawlSelfHostedUrl: 'http://localhost:3002',

    // Public (exposed to client)
    public: {
      appName: 'AI Chat',
    },
  },

  nitro: {
    // Enable better-sqlite3 in Nitro
    externals: {
      inline: ['better-sqlite3'],
    },
  },
});
```

---

### Task 1.3: Set Up Folder Structure

**Create the following directory structure:**

```
ai-chat/
├── server/
│   ├── api/
│   │   ├── conversations/
│   │   └── settings/
│   ├── db/
│   ├── tools/
│   └── utils/
├── pages/
│   └── chat/
├── components/
│   ├── layout/
│   ├── chat/
│   ├── tools/
│   ├── sidebar/
│   ├── settings/
│   └── models/
├── composables/
├── types/
├── assets/
│   └── css/
└── data/
```

**Commands:**
```bash
mkdir -p server/api/conversations server/api/settings server/db server/tools server/utils
mkdir -p pages/chat
mkdir -p components/layout components/chat components/tools components/sidebar components/settings components/models
mkdir -p composables types assets/css data
touch data/.gitkeep
```

---

### Task 1.4: Create Environment Template

**Create `.env.example`:**

```env
# OpenRouter API Key (required)
# Get from: https://openrouter.ai/keys
NUXT_OPENROUTER_API_KEY=sk-or-...

# Firecrawl - Self-hosted mode
NUXT_FIRECRAWL_SELF_HOSTED_URL=http://localhost:3002

# Firecrawl - Cloud mode (optional)
NUXT_FIRECRAWL_API_KEY=fc-...
```

**Create `.env` (copy from example, fill in your keys):**
```bash
cp .env.example .env
```

**Add to `.gitignore`:**
```
.env
data/*.db
```

---

### Task 1.5: Set Up SQLite Database

**Create `server/db/index.ts`:**

```typescript
import Database from 'better-sqlite3';
import { join } from 'path';

// Database file location
const dbPath = join(process.cwd(), 'data', 'chat.db');

// Create database instance
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    model TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
`);

export default db;
```

**Create `server/db/schema.ts`:**

```typescript
// Type definitions for database records

export interface ConversationRecord {
  id: string;
  title: string;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string; // JSON string of UIMessage parts
  created_at: string;
}

export interface SettingRecord {
  key: string;
  value: string; // JSON string
  updated_at: string;
}
```

---

### Task 1.6: Create Base Layout Components

**Create `components/layout/AppLayout.vue`:**

```vue
<template>
  <div class="app-layout">
    <aside class="sidebar">
      <slot name="sidebar" />
    </aside>
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.sidebar {
  width: 260px;
  min-width: 260px;
  background: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
```

**Create `components/layout/Sidebar.vue`:**

```vue
<template>
  <div class="sidebar-container">
    <div class="sidebar-header">
      <button class="new-chat-btn" @click="$emit('new-chat')">
        + New Chat
      </button>
    </div>

    <div class="sidebar-content">
      <slot />
    </div>

    <div class="sidebar-footer">
      <NuxtLink to="/settings" class="settings-link">
        Settings
      </NuxtLink>
      <NuxtLink to="/models" class="settings-link">
        Models
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  'new-chat': [];
}>();
</script>

<style scoped>
.sidebar-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.new-chat-btn {
  width: 100%;
  padding: 10px 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.new-chat-btn:hover {
  background: #333;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-link {
  color: #666;
  text-decoration: none;
  font-size: 14px;
  padding: 8px;
  border-radius: 4px;
}

.settings-link:hover {
  background: #e0e0e0;
}
</style>
```

**Create `app.vue`:**

```vue
<template>
  <NuxtPage />
</template>
```

**Create basic `pages/index.vue`:**

```vue
<template>
  <AppLayout>
    <template #sidebar>
      <Sidebar @new-chat="handleNewChat">
        <p style="padding: 16px; color: #666; font-size: 14px;">
          No conversations yet
        </p>
      </Sidebar>
    </template>

    <div class="chat-placeholder">
      <h1>AI Chat</h1>
      <p>Phase 1 complete. Chat functionality coming in Phase 2.</p>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
const handleNewChat = () => {
  // Will be implemented in Phase 2
  console.log('New chat clicked');
};
</script>

<style scoped>
.chat-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}

.chat-placeholder h1 {
  font-size: 24px;
  margin-bottom: 8px;
}

.chat-placeholder p {
  font-size: 14px;
}
</style>
```

**Create `assets/css/main.css`:**

```css
/* Reset and base styles */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: #333;
  background: #fff;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font-family: inherit;
  font-size: inherit;
}
```

**Update `nuxt.config.ts` to include CSS:**

```typescript
export default defineNuxtConfig({
  // ... existing config
  css: ['~/assets/css/main.css'],
});
```

---

## Acceptance Criteria

- [ ] `pnpm dev` starts without errors
- [ ] App loads at http://localhost:3000
- [ ] Sidebar and main layout visible
- [ ] Database file created at `data/chat.db`
- [ ] All tables exist (conversations, messages, settings)
- [ ] TypeScript compiles without errors

---

## Testing

```bash
# Start dev server
pnpm dev

# In another terminal, verify database
sqlite3 data/chat.db ".tables"
# Should show: conversations  messages  settings

# Verify schema
sqlite3 data/chat.db ".schema conversations"
```

---

## Files Created

```
ai-chat/
├── .env.example
├── .env
├── nuxt.config.ts (modified)
├── app.vue
├── assets/css/main.css
├── components/layout/
│   ├── AppLayout.vue
│   └── Sidebar.vue
├── data/.gitkeep
├── pages/index.vue
├── server/db/
│   ├── index.ts
│   └── schema.ts
└── package.json (modified with dependencies)
```

---

## Next Phase

Once Phase 1 is complete, proceed to **Phase 2: Core Chat** to implement the chat functionality.

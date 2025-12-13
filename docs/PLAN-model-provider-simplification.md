# Plan: Simplify Model & Provider Selection

**Date:** 2025-12-13
**Status:** Planning
**Priority:** High - Current implementation has bugs and is overly complex

---

## Context: Why This Change?

### Current Problems

The current data model for tracking model and provider preferences is overly complex and buggy:

```
settings:
  model                    ← "Default model" (legacy, unclear purpose)
  lastActiveModel          ← "Last model used" (just a string, no provider)
  providerPreferences      ← GLOBAL provider (causes bugs!)
  modelProviderPreferences ← Per-model provider memory
```

**Bug observed:** When user has Kimi K2 selected with Groq provider, visiting the home page shows Opus 4.5 instead of Kimi K2. But when provider is set to "auto", it correctly shows Kimi K2.

**Root cause:** The global `providerPreferences` is incompatible with certain models. Groq doesn't serve all models, so there's a hidden conflict between model and provider that causes fallback behavior.

### The Core Issue

Model and provider are being tracked **separately**, but they should be a **pair**:
- You don't just use "Kimi K2" - you use "Kimi K2 via Groq"
- You don't just use "GPT-5.2" - you use "GPT-5.2 via OpenAI"

When these are tracked separately, bugs emerge because a provider might not serve a model.

---

## Desired Behavior

### Two Separate Concerns

#### 1. Per-Model Memory (`modelProviderPreferences`)

When you manually configure a model with a specific provider, the app remembers that pair.

**Example:**
- Configure Kimi K2 to use Groq
- Switch to GPT-5.2
- Switch back to Kimi K2 → it remembers Groq

This is convenience memory for switching between models within a session.

#### 2. Default for NEW Conversations (`lastUsed`)

When starting a fresh chat, what model+provider should it default to?

This should be a **single pair**: `{ model: string, provider: string }`

### Key Behavior: When Does `lastUsed` Update?

#### Scenario A: New Conversation

1. User starts a new conversation
2. App defaults to `lastUsed` (e.g., Qwen + Auto)
3. User might change the model to Claude
4. User sends a message
5. **`lastUsed` updates** to Claude + selected provider
6. Next new chat defaults to Claude

#### Scenario B: Revisiting Old Conversation

1. User opens an old chat from weeks ago (it has GPT 5.2 stored)
2. That conversation uses its OWN stored model (GPT 5.2)
3. User sends a message to GPT 5.2
4. **`lastUsed` does NOT change** - user is just resuming, not expressing new preference
5. User starts a new chat → still defaults to previous `lastUsed` (e.g., Qwen)

### The Rule

> **Only update `lastUsed` when sending the FIRST message of a NEW conversation.**
>
> Resuming or continuing existing conversations does NOT change your default preference.

### Why This Makes Sense

- **New conversation** = user is actively choosing what they want to use → update preference
- **Old conversation** = user is just continuing a past chat → don't change their default

Each conversation stores its own `model + provider`, separate from the global `lastUsed`.

---

## Proposed Data Model

### Settings (Global)

```typescript
interface Settings {
  // ... other settings (systemPrompt, temperature, etc.)

  // NEW: Single source of truth for new conversation defaults
  lastUsed: {
    model: string;      // e.g., "moonshotai/kimi-k2-0905"
    provider: string;   // e.g., "groq" or "auto"
  };

  // KEEP: Per-model provider memory (for switching between models)
  modelProviderPreferences: Record<string, string>;
  // e.g., { "moonshotai/kimi-k2-0905": "groq", "openai/gpt-5.2": "auto" }

  // REMOVE: These are redundant/confusing
  // - model (replaced by lastUsed.model)
  // - lastActiveModel (replaced by lastUsed)
  // - providerPreferences (global provider is the bug source)
}
```

### Conversation (Per-Chat)

```typescript
interface Conversation {
  id: string;
  title: string;

  // Each conversation stores its own model+provider
  model: string;
  provider: string;  // or could keep as providerPreferences object

  // ... other fields
}
```

---

## Implementation Plan

### Phase 1: Database Migration

**File:** `server/db/index.ts`

1. Add migration to transform existing data:
   ```sql
   -- Combine lastActiveModel + modelProviderPreferences into lastUsed
   -- Read lastActiveModel value
   -- Read its provider from modelProviderPreferences (or default to 'auto')
   -- Store as JSON: {"model": "...", "provider": "..."}
   ```

2. Remove deprecated keys after migration:
   - `model` (legacy default)
   - `lastActiveModel` (replaced by `lastUsed`)
   - `providerPreferences` (global provider - source of bugs)

### Phase 2: Type Definitions

**File:** `app/types/index.ts`

```typescript
// NEW
interface LastUsed {
  model: string;
  provider: string;
}

interface Settings {
  // Remove: model, lastActiveModel, providerPreferences

  lastUsed: LastUsed;
  modelProviderPreferences: Record<string, string>;

  // Keep other settings unchanged
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  // ...
}

// Update defaultSettings
export const defaultSettings: Settings = {
  lastUsed: {
    model: 'anthropic/claude-sonnet-4',
    provider: 'auto',
  },
  modelProviderPreferences: {},
  // ...
};
```

### Phase 3: Settings API

**File:** `server/api/settings/index.get.ts`

- Return `lastUsed` as the combined object
- Handle backward compatibility during migration

**File:** `server/api/settings/index.put.ts`

- Accept updates to `lastUsed`
- Accept updates to `modelProviderPreferences`

### Phase 4: Server-Side Tracking

**File:** `server/api/chat.post.ts`

Update the logic that saves `lastActiveModel`:

```typescript
// BEFORE (current - buggy)
db.prepare(`
  INSERT INTO settings (key, value, updated_at)
  VALUES ('lastActiveModel', ?, CURRENT_TIMESTAMP)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
`).run(selectedModel);

// AFTER (proposed)
// Only update lastUsed if this is a NEW conversation (first message)
if (isNewConversation) {
  const lastUsed = JSON.stringify({
    model: selectedModel,
    provider: providerPreferences?.provider || 'auto'
  });

  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES ('lastUsed', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(lastUsed);
}
```

Key change: **Only update when `isNewConversation` is true** (first message creates the conversation).

### Phase 5: useSettings Composable

**File:** `app/composables/useSettings.ts`

```typescript
// BEFORE
const lastActiveModel = computed(() =>
  settings.value.lastActiveModel || settings.value.model
);

// AFTER
const lastUsed = computed(() => settings.value.lastUsed);

// Helper to get provider for a model (from memory or default)
function getModelProvider(modelId: string): string {
  return settings.value.modelProviderPreferences[modelId] || 'auto';
}

// Helper to set provider for a model
async function setModelProvider(modelId: string, provider: string): Promise<void> {
  const current = settings.value.modelProviderPreferences || {};
  await updateSettings({
    modelProviderPreferences: { ...current, [modelId]: provider },
  });
}
```

### Phase 6: Home Page

**File:** `app/pages/index.vue`

```typescript
// BEFORE (complex, buggy)
const selectedModelId = ref('');
const providerPreferences = ref<ProviderPreferences>({...});
// + watches, sync logic, race conditions

// AFTER (simple)
const { lastUsed, getModelProvider } = useSettings();

// Model selection - derives from lastUsed, can be overridden
const userModelOverride = ref<string | null>(null);
const userProviderOverride = ref<string | null>(null);

const selectedModel = computed(() =>
  userModelOverride.value ?? lastUsed.value.model
);

const selectedProvider = computed(() =>
  userProviderOverride.value ?? getModelProvider(selectedModel.value)
);
```

### Phase 7: Chat Page

**File:** `app/pages/chat/[id].vue`

```typescript
// For NEW conversations (draft mode):
// - Default to lastUsed.model and lastUsed.provider
// - When user changes, update local state
// - On first message send, server updates lastUsed

// For EXISTING conversations:
// - Use conversation's stored model and provider
// - Sending messages does NOT update lastUsed
```

The key distinction is `isDraftConversation`:
- `true` → use `lastUsed` as default, update `lastUsed` on send
- `false` → use conversation's stored model, DON'T update `lastUsed`

### Phase 8: Cleanup

Remove dead code:
- References to `settings.model`
- References to `settings.lastActiveModel`
- References to `settings.providerPreferences` (global)
- Old watchers and sync logic

---

## Files to Modify

| File | Changes |
|------|---------|
| `server/db/index.ts` | Migration to transform data |
| `app/types/index.ts` | Update Settings interface, defaultSettings |
| `server/api/settings/index.get.ts` | Return new structure |
| `server/api/settings/index.put.ts` | Accept new structure |
| `server/api/chat.post.ts` | Only update `lastUsed` for new conversations |
| `app/composables/useSettings.ts` | New helpers, remove old computed |
| `app/pages/index.vue` | Simplify model/provider selection |
| `app/pages/chat/[id].vue` | Use `lastUsed` for drafts, conversation model for existing |
| `app/components/models/ModelSelector.vue` | May need minor updates |

---

## Testing Checklist

After implementation, verify these scenarios:

### New Conversation Flow
- [ ] Start new chat → defaults to `lastUsed` model and provider
- [ ] Change model → UI updates
- [ ] Change provider → UI updates
- [ ] Send message → `lastUsed` updates in DB
- [ ] Start another new chat → defaults to the model/provider you just used

### Old Conversation Flow
- [ ] Open existing conversation → uses that conversation's model/provider
- [ ] Send message → `lastUsed` does NOT change
- [ ] Start new chat → still uses previous `lastUsed`, not the old conversation's model

### Per-Model Memory
- [ ] Set Kimi K2 to use Groq
- [ ] Switch to GPT-5.2
- [ ] Switch back to Kimi K2 → provider is still Groq (remembered)

### Edge Cases
- [ ] First-time user (no settings) → reasonable defaults
- [ ] Migration from old data → works correctly
- [ ] Invalid model/provider in DB → graceful fallback

---

## Summary

**Before:** Complex, separate tracking of model and provider with race conditions and bugs.

**After:**
- `lastUsed: { model, provider }` - single source of truth for new conversations
- `modelProviderPreferences` - per-model provider memory
- Each conversation stores its own model+provider
- Only update `lastUsed` on FIRST message of NEW conversations

This eliminates the global provider bug and simplifies the data flow.

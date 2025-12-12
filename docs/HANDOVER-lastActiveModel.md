# Handover: lastActiveModel Feature Implementation

**Date:** 2025-12-13
**Status:** NOT WORKING - Requires Investigation
**Issue:** New conversations still default to Opus 4.5 instead of the last model user sent a message with

---

## Feature Goal

When user sends a message with Model X, then starts a NEW conversation, it should default to Model X (not the hardcoded default Opus 4.5).

**Example flow:**
1. User selects "GPT-5.2", sends a message
2. User clicks "New Chat"
3. New chat should default to "GPT-5.2" (the last model they actually used)

**Why this matters:**
- Previously, just VIEWING an old conversation changed the global default (bad UX)
- We want the default to only change when user actually SENDS a message

---

## What Was Implemented

### 1. New Settings Fields (`app/types/index.ts`)

```typescript
interface Settings {
  // ... existing fields
  lastActiveModel?: string;  // Set server-side when message is sent
  modelProviderPreferences?: Record<string, ProviderPreferences>;  // Per-model provider prefs
}
```

### 2. Server-Side Tracking (`server/api/chat.post.ts`)

After `saveUserMessage()` (around line 139-146), we save the model to settings:

```typescript
// 2.5 Update last active model (track which model user is actually sending messages with)
db.prepare(`
  INSERT INTO settings (key, value, updated_at)
  VALUES ('lastActiveModel', ?, CURRENT_TIMESTAMP)
  ON CONFLICT(key) DO UPDATE SET
    value = excluded.value,
    updated_at = CURRENT_TIMESTAMP
`).run(selectedModel);
```

### 3. Settings API Fix (`server/api/settings/index.get.ts`)

Added handling for `lastActiveModel` which isn't in `defaultSettings`:

```typescript
const stringOnlyKeys = new Set(['lastActiveModel']);

for (const record of records) {
  const key = record.key as keyof Settings;

  if (key in defaultSettings) {
    // ... existing logic
  }
  // Handle string-only keys not in defaults (like lastActiveModel)
  else if (stringOnlyKeys.has(key)) {
    settings[key] = record.value as never;
  }
}
```

### 4. Composable Helper (`app/composables/useSettings.ts`)

```typescript
// Last active model (the model user last sent a message with)
const lastActiveModel = computed(() => settings.value.lastActiveModel || settings.value.model);
```

### 5. Home Page (`app/pages/index.vue`)

- Uses `lastActiveModel.value` as initial value for `selectedModelId`
- Has a watcher to sync when settings load
- Removed the watcher that updated global `settings.model` on selection

### 6. Chat Page (`app/pages/chat/[id].vue`)

- Uses `lastActiveModel.value` instead of `settings.value.model`
- Removed `updateSettings({ model: newModel })` from model watcher
- Now only saves to conversation, not global settings

---

## Current State - NOT WORKING

**Symptom:** After sending a message with GPT, starting a new conversation still shows Opus 4.5.

**What we've verified works:**
- ✅ Server-side code saves `lastActiveModel` to database (the INSERT/UPDATE query runs)

**What might be wrong:**

### Hypothesis 1: Settings Not Being Refetched
- When user navigates from chat → home, does `fetchSettings()` run again?
- The home page calls `fetchSettings()` in `onMounted`, but it has a guard: `if (hasFetched.value && !force) return;`
- So if settings were already fetched, it won't fetch again to get the new `lastActiveModel`

### Hypothesis 2: Timing Issue
- The server saves `lastActiveModel` AFTER the response starts streaming
- User might navigate to new chat before the setting is actually saved

### Hypothesis 3: API Not Returning It
- Even with the fix to `index.get.ts`, something might still be wrong
- Need to check: `curl http://localhost:3000/api/settings` and see if `lastActiveModel` is in the response

### Hypothesis 4: Computed Not Updating
- `lastActiveModel` is a computed based on `settings.value.lastActiveModel`
- If `settings.value` doesn't have `lastActiveModel`, it falls back to `settings.value.model` (Opus 4.5)

---

## Files Modified (Uncommitted)

1. `server/api/settings/index.get.ts` - Handle `lastActiveModel` in API response
2. `app/pages/index.vue` - Watch logic fix with `userHasSelectedModel` flag

## Files Modified (Already Committed)

1. `app/types/index.ts` - Added `lastActiveModel`, `modelProviderPreferences`
2. `server/api/chat.post.ts` - Save `lastActiveModel` after user message
3. `app/composables/useSettings.ts` - Added `lastActiveModel` computed, helper functions
4. `app/pages/index.vue` - Use `lastActiveModel` as default
5. `app/pages/chat/[id].vue` - Remove global settings updates

---

## Debugging Steps for Next Agent

1. **Check if `lastActiveModel` is saved to DB:**
   ```bash
   sqlite3 data/chat.db "SELECT * FROM settings WHERE key = 'lastActiveModel';"
   ```

2. **Check if API returns it:**
   ```bash
   curl http://localhost:3000/api/settings | jq .
   ```
   Look for `lastActiveModel` in the response.

3. **Add console.log to trace the flow:**
   - In `server/api/chat.post.ts` after the INSERT, log: `console.log('[Chat API] Saved lastActiveModel:', selectedModel);`
   - In `server/api/settings/index.get.ts`, log the final settings object before returning
   - In `app/pages/index.vue`, log `lastActiveModel.value` in onMounted

4. **Check if fetchSettings is being called on navigation:**
   - Add `console.log('[Home] fetchSettings called, hasFetched:', hasFetched.value)` before the guard

5. **Force refetch on mount:**
   - Try changing `fetchSettings()` to `fetchSettings(true)` in home page's onMounted

---

## Related Changes Also Made

### Per-Model Provider Preferences
- Each model remembers its own provider preference
- Stored in `modelProviderPreferences` map
- When switching models, loads that model's provider prefs

### Pinned Models Fix
- Fixed bug where pinned models outside top 50 didn't show
- `pinnedModelsList` now computed from full list, not sliced `filteredModels`

---

## Git Status

```
Committed: 3964c7d - Add per-model provider preferences and fix model selection
Uncommitted:
  - server/api/settings/index.get.ts (API fix for lastActiveModel)
  - app/pages/index.vue (watch logic fix)
```

---

## Key Insight

The core issue is likely that `lastActiveModel` is saved to the database but not making it back to the client. The data flow is:

```
1. User sends message
2. Server saves lastActiveModel to DB ✓ (probably working)
3. User navigates to home page
4. Home page calls fetchSettings()
5. API reads from DB and returns settings
6. lastActiveModel should be in response ← CHECK THIS
7. Client updates settings.value
8. lastActiveModel computed returns new value ← CHECK THIS
9. selectedModelId ref updates ← CHECK THIS
```

Debug each step to find where the chain breaks.

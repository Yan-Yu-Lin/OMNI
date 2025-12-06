# Phase 6: Settings

> Add settings page and configuration persistence.

---

## Prerequisites

- Phase 5 completed
- Conversation persistence working
- SQLite database has settings table

---

## Skills to Load

None required for this phase.

---

## Tasks

### Task 6.1: Create Settings API Routes

**Create `server/api/settings/index.get.ts`:**

```typescript
import db from '../../db';
import type { SettingRecord } from '../../db/schema';
import type { Settings } from '~/types';
import { defaultSettings } from '~/types';

export default defineEventHandler(async () => {
  const rows = db.prepare('SELECT key, value FROM settings').all() as SettingRecord[];

  const settings: Settings = { ...defaultSettings };

  for (const row of rows) {
    try {
      (settings as any)[row.key] = JSON.parse(row.value);
    } catch {
      (settings as any)[row.key] = row.value;
    }
  }

  return settings;
});
```

**Create `server/api/settings/index.put.ts`:**

```typescript
import db from '../../db';
import type { Settings } from '~/types';

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<Settings>>(event);

  const upsert = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `);

  const updateMany = db.transaction((settings: Partial<Settings>) => {
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined) {
        upsert.run(key, JSON.stringify(value));
      }
    }
  });

  updateMany(body);

  return { success: true };
});
```

---

### Task 6.2: Create Settings Composable

**Create `composables/useSettings.ts`:**

```typescript
import type { Settings } from '~/types';
import { defaultSettings } from '~/types';

export function useSettings() {
  const settings = ref<Settings>({ ...defaultSettings });
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  // Fetch settings
  const fetchSettings = async () => {
    loading.value = true;
    error.value = null;

    try {
      settings.value = await $fetch('/api/settings');
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch settings';
      console.error('Failed to fetch settings:', e);
    } finally {
      loading.value = false;
    }
  };

  // Save settings
  const saveSettings = async (updates: Partial<Settings>) => {
    saving.value = true;
    error.value = null;

    try {
      await $fetch('/api/settings', {
        method: 'PUT',
        body: updates,
      });

      // Update local state
      settings.value = { ...settings.value, ...updates };
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save settings';
      console.error('Failed to save settings:', e);
      throw e;
    } finally {
      saving.value = false;
    }
  };

  // Update single setting
  const updateSetting = async <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    await saveSettings({ [key]: value } as Partial<Settings>);
  };

  return {
    settings,
    loading,
    saving,
    error,
    fetchSettings,
    saveSettings,
    updateSetting,
  };
}
```

---

### Task 6.3: Create Settings Page Components

**Create `components/settings/GeneralSettings.vue`:**

```vue
<template>
  <div class="settings-section">
    <h2>General Settings</h2>

    <div class="setting-group">
      <label for="systemPrompt">System Prompt</label>
      <textarea
        id="systemPrompt"
        v-model="localSystemPrompt"
        rows="4"
        placeholder="Enter system prompt..."
        @blur="handleSystemPromptChange"
      />
      <p class="setting-help">
        Instructions given to the AI at the start of each conversation.
      </p>
    </div>

    <div class="setting-group">
      <label for="temperature">Temperature: {{ localTemperature }}</label>
      <input
        id="temperature"
        v-model.number="localTemperature"
        type="range"
        min="0"
        max="2"
        step="0.1"
        @change="handleTemperatureChange"
      />
      <p class="setting-help">
        Lower = more focused and deterministic. Higher = more creative and random.
      </p>
    </div>

    <div class="setting-group">
      <label for="maxTokens">Max Tokens: {{ localMaxTokens }}</label>
      <input
        id="maxTokens"
        v-model.number="localMaxTokens"
        type="range"
        min="256"
        max="16384"
        step="256"
        @change="handleMaxTokensChange"
      />
      <p class="setting-help">
        Maximum length of AI responses.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Settings } from '~/types';

const props = defineProps<{
  settings: Settings;
}>();

const emit = defineEmits<{
  update: [key: keyof Settings, value: any];
}>();

const localSystemPrompt = ref(props.settings.systemPrompt);
const localTemperature = ref(props.settings.temperature);
const localMaxTokens = ref(props.settings.maxTokens);

// Sync with props
watch(() => props.settings, (newSettings) => {
  localSystemPrompt.value = newSettings.systemPrompt;
  localTemperature.value = newSettings.temperature;
  localMaxTokens.value = newSettings.maxTokens;
});

const handleSystemPromptChange = () => {
  if (localSystemPrompt.value !== props.settings.systemPrompt) {
    emit('update', 'systemPrompt', localSystemPrompt.value);
  }
};

const handleTemperatureChange = () => {
  emit('update', 'temperature', localTemperature.value);
};

const handleMaxTokensChange = () => {
  emit('update', 'maxTokens', localMaxTokens.value);
};
</script>

<style scoped>
.settings-section {
  margin-bottom: 32px;
}

.settings-section h2 {
  font-size: 18px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
}

.setting-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
}

.setting-group textarea:focus {
  outline: none;
  border-color: #000;
}

.setting-group input[type="range"] {
  width: 100%;
}

.setting-help {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}
</style>
```

**Create `components/settings/ModelSettings.vue`:**

```vue
<template>
  <div class="settings-section">
    <h2>Model Settings</h2>

    <div class="setting-group">
      <label for="model">Current Model</label>
      <div class="model-display">
        <span class="model-name">{{ settings.model }}</span>
        <NuxtLink to="/models" class="change-btn">
          Change Model
        </NuxtLink>
      </div>
      <p class="setting-help">
        Select a different model from the Models page.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Settings } from '~/types';

defineProps<{
  settings: Settings;
}>();
</script>

<style scoped>
.settings-section {
  margin-bottom: 32px;
}

.settings-section h2 {
  font-size: 18px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
}

.model-display {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 6px;
}

.model-name {
  flex: 1;
  font-family: monospace;
  font-size: 14px;
}

.change-btn {
  padding: 8px 16px;
  background: #000;
  color: #fff;
  border-radius: 4px;
  font-size: 14px;
  text-decoration: none;
}

.change-btn:hover {
  background: #333;
}

.setting-help {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
}
</style>
```

**Create `components/settings/FirecrawlSettings.vue`:**

```vue
<template>
  <div class="settings-section">
    <h2>Firecrawl Settings</h2>

    <div class="setting-group">
      <label>Mode</label>
      <div class="mode-toggle">
        <button
          :class="{ active: settings.firecrawlMode === 'self-hosted' }"
          @click="handleModeChange('self-hosted')"
        >
          Self-Hosted
        </button>
        <button
          :class="{ active: settings.firecrawlMode === 'cloud' }"
          @click="handleModeChange('cloud')"
        >
          Cloud API
        </button>
      </div>
    </div>

    <template v-if="settings.firecrawlMode === 'self-hosted'">
      <div class="setting-group">
        <label for="firecrawlUrl">Self-Hosted URL</label>
        <input
          id="firecrawlUrl"
          v-model="localSelfHostedUrl"
          type="url"
          placeholder="http://localhost:3002"
          @blur="handleUrlChange"
        />
        <p class="setting-help">
          URL of your self-hosted Firecrawl instance.
        </p>
      </div>
    </template>

    <template v-else>
      <div class="setting-group">
        <label for="firecrawlApiKey">Firecrawl API Key</label>
        <input
          id="firecrawlApiKey"
          v-model="localApiKey"
          type="password"
          placeholder="fc-..."
          @blur="handleApiKeyChange"
        />
        <p class="setting-help">
          Get your API key from <a href="https://firecrawl.dev" target="_blank">firecrawl.dev</a>
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Settings } from '~/types';

const props = defineProps<{
  settings: Settings;
}>();

const emit = defineEmits<{
  update: [key: keyof Settings, value: any];
}>();

const localSelfHostedUrl = ref(props.settings.firecrawlSelfHostedUrl);
const localApiKey = ref(props.settings.firecrawlApiKey);

watch(() => props.settings, (newSettings) => {
  localSelfHostedUrl.value = newSettings.firecrawlSelfHostedUrl;
  localApiKey.value = newSettings.firecrawlApiKey;
});

const handleModeChange = (mode: 'self-hosted' | 'cloud') => {
  emit('update', 'firecrawlMode', mode);
};

const handleUrlChange = () => {
  if (localSelfHostedUrl.value !== props.settings.firecrawlSelfHostedUrl) {
    emit('update', 'firecrawlSelfHostedUrl', localSelfHostedUrl.value);
  }
};

const handleApiKeyChange = () => {
  if (localApiKey.value !== props.settings.firecrawlApiKey) {
    emit('update', 'firecrawlApiKey', localApiKey.value);
  }
};
</script>

<style scoped>
.settings-section {
  margin-bottom: 32px;
}

.settings-section h2 {
  font-size: 18px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
}

.mode-toggle {
  display: flex;
  gap: 8px;
}

.mode-toggle button {
  flex: 1;
  padding: 12px;
  border: 1px solid #e0e0e0;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.1s;
}

.mode-toggle button:hover {
  background: #f5f5f5;
}

.mode-toggle button.active {
  background: #000;
  color: #fff;
  border-color: #000;
}

.setting-group input[type="url"],
.setting-group input[type="password"] {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
}

.setting-group input:focus {
  outline: none;
  border-color: #000;
}

.setting-help {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.setting-help a {
  color: #0066cc;
}
</style>
```

---

### Task 6.4: Create Settings Page

**Create `pages/settings.vue`:**

```vue
<template>
  <AppLayout>
    <template #sidebar>
      <Sidebar @new-chat="handleNewChat">
        <ConversationList
          :conversations="conversations"
          :loading="loadingConversations"
          @select="handleSelectConversation"
          @delete="handleDeleteConversation"
        />
      </Sidebar>
    </template>

    <div class="settings-page">
      <header class="settings-header">
        <h1>Settings</h1>
        <span v-if="saving" class="save-status">Saving...</span>
        <span v-else-if="lastSaved" class="save-status">Saved</span>
      </header>

      <div v-if="loading" class="loading">
        Loading settings...
      </div>

      <div v-else class="settings-content">
        <ModelSettings :settings="settings" />

        <GeneralSettings
          :settings="settings"
          @update="handleUpdate"
        />

        <FirecrawlSettings
          :settings="settings"
          @update="handleUpdate"
        />
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import type { Settings } from '~/types';

const router = useRouter();

const {
  settings,
  loading,
  saving,
  fetchSettings,
  updateSetting,
} = useSettings();

const {
  conversations,
  loading: loadingConversations,
  fetchConversations,
  createConversation,
  deleteConversation,
} = useConversations();

const lastSaved = ref(false);

const handleUpdate = async (key: keyof Settings, value: any) => {
  await updateSetting(key, value);
  lastSaved.value = true;
  setTimeout(() => {
    lastSaved.value = false;
  }, 2000);
};

const handleNewChat = async () => {
  const conv = await createConversation();
  router.push(`/chat/${conv.id}`);
};

const handleSelectConversation = (id: string) => {
  router.push(`/chat/${id}`);
};

const handleDeleteConversation = async (id: string) => {
  await deleteConversation(id);
};

onMounted(() => {
  fetchSettings();
  fetchConversations();
});
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px;
  border-bottom: 1px solid #e0e0e0;
}

.settings-header h1 {
  font-size: 24px;
  margin: 0;
}

.save-status {
  font-size: 14px;
  color: #666;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #666;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  max-width: 600px;
}
</style>
```

---

### Task 6.5: Update Chat Endpoint to Use Settings

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
import type { ChatRequest, Settings } from '~/types';
import { defaultSettings } from '~/types';
import db from '../db';

// Helper to get settings
function getSettings(): Settings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as any[];

  const settings: Settings = { ...defaultSettings };

  for (const row of rows) {
    try {
      (settings as any)[row.key] = JSON.parse(row.value);
    } catch {
      (settings as any)[row.key] = row.value;
    }
  }

  return settings;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ChatRequest>(event);
  const { messages, model } = body;

  if (!messages || !Array.isArray(messages)) {
    throw createError({
      statusCode: 400,
      message: 'Messages array is required',
    });
  }

  // Get settings
  const settings = getSettings();

  const openrouter = getOpenRouterClient();
  const selectedModel = model || settings.model;

  const result = streamText({
    model: openrouter(selectedModel),
    system: settings.systemPrompt,
    messages: convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(10),
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
  });

  return result.toUIMessageStreamResponse();
});
```

---

### Task 6.6: Update Firecrawl Client to Use Settings

**Update `server/utils/firecrawl.ts`:**

```typescript
import db from '../db';
import type { Settings } from '~/types';
import { defaultSettings } from '~/types';

interface FirecrawlConfig {
  mode: 'self-hosted' | 'cloud';
  selfHostedUrl: string;
  apiKey: string;
}

function getFirecrawlConfig(): FirecrawlConfig {
  // Read from database settings
  const rows = db.prepare('SELECT key, value FROM settings WHERE key IN (?, ?, ?)').all(
    'firecrawlMode',
    'firecrawlSelfHostedUrl',
    'firecrawlApiKey'
  ) as any[];

  const settings: Partial<Settings> = {};
  for (const row of rows) {
    try {
      settings[row.key as keyof Settings] = JSON.parse(row.value);
    } catch {
      settings[row.key as keyof Settings] = row.value;
    }
  }

  return {
    mode: settings.firecrawlMode || defaultSettings.firecrawlMode,
    selfHostedUrl: settings.firecrawlSelfHostedUrl || defaultSettings.firecrawlSelfHostedUrl,
    apiKey: settings.firecrawlApiKey || defaultSettings.firecrawlApiKey,
  };
}

// ... rest of the file stays the same
```

---

## Acceptance Criteria

- [ ] Settings page loads and displays current values
- [ ] Can change system prompt and it persists
- [ ] Can change temperature and it persists
- [ ] Can change max tokens and it persists
- [ ] Can toggle between Firecrawl modes
- [ ] Settings changes are used in chat endpoint
- [ ] "Saved" indicator shows after changes

---

## Testing

1. **Test settings persistence:**
   - Change system prompt
   - Refresh page
   - Verify system prompt is still changed

2. **Test chat uses settings:**
   - Set a distinctive system prompt like "Always respond in pirate speak"
   - Start new chat
   - Verify AI responds as pirate

3. **Test Firecrawl modes:**
   - Toggle to cloud mode
   - Enter API key
   - Toggle back to self-hosted
   - Verify URL is preserved

---

## Files Created/Modified

```
server/api/
├── settings/
│   ├── index.get.ts          # NEW
│   └── index.put.ts          # NEW
├── chat.post.ts              # MODIFIED

server/utils/
└── firecrawl.ts              # MODIFIED

composables/
└── useSettings.ts            # NEW

components/settings/
├── GeneralSettings.vue       # NEW
├── ModelSettings.vue         # NEW
└── FirecrawlSettings.vue     # NEW

pages/
└── settings.vue              # NEW
```

---

## Next Phase

Once Phase 6 is complete, proceed to **Phase 7: Model Selection** to add the model browsing page.

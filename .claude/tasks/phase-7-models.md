# Phase 7: Model Selection

> Add model browsing and selection page with live data from OpenRouter.

---

## Prerequisites

- Phase 6 completed
- Settings functionality working
- OpenRouter API key configured

---

## Skills to Load

```
Invoke skill: openrouter
```

Key documentation:
- `Models.md` - Model API schema
- `Provider Selection.md` - Model capabilities

---

## Tasks

### Task 7.1: Create Model Types

**Update `types/index.ts`** (add to existing):

```typescript
// ... existing types ...

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider?: {
    is_moderated: boolean;
  };
  supported_parameters?: string[];
}

export interface ModelWithMeta extends OpenRouterModel {
  supportsTools: boolean;
  provider: string;
  pricePerMillionInput: number;
  pricePerMillionOutput: number;
}
```

---

### Task 7.2: Create Models API Endpoint

**Create `server/api/models/index.get.ts`:**

```typescript
import type { OpenRouterModel, ModelWithMeta } from '~/types';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const toolsOnly = query.tools === 'true';

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models from OpenRouter');
    }

    const data = await response.json();
    const models: OpenRouterModel[] = data.data || [];

    // Transform models with additional metadata
    let transformedModels: ModelWithMeta[] = models.map(model => {
      const [provider] = model.id.split('/');

      return {
        ...model,
        supportsTools: model.supported_parameters?.includes('tools') || false,
        provider,
        pricePerMillionInput: parseFloat(model.pricing.prompt) * 1_000_000,
        pricePerMillionOutput: parseFloat(model.pricing.completion) * 1_000_000,
      };
    });

    // Filter for tools support if requested
    if (toolsOnly) {
      transformedModels = transformedModels.filter(m => m.supportsTools);
    }

    // Sort by provider, then name
    transformedModels.sort((a, b) => {
      if (a.provider !== b.provider) {
        return a.provider.localeCompare(b.provider);
      }
      return a.name.localeCompare(b.name);
    });

    return transformedModels;
  } catch (error) {
    console.error('Failed to fetch models:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch models from OpenRouter',
    });
  }
});
```

---

### Task 7.3: Create Models Composable

**Create `composables/useModels.ts`:**

```typescript
import type { ModelWithMeta } from '~/types';

export function useModels() {
  const models = ref<ModelWithMeta[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Filters
  const searchQuery = ref('');
  const selectedProvider = ref<string>('');
  const toolsOnly = ref(true); // Default to models that support tools

  // Fetch models
  const fetchModels = async () => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      if (toolsOnly.value) {
        params.set('tools', 'true');
      }

      models.value = await $fetch(`/api/models?${params}`);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch models';
      console.error('Failed to fetch models:', e);
    } finally {
      loading.value = false;
    }
  };

  // Get unique providers
  const providers = computed(() => {
    const providerSet = new Set(models.value.map(m => m.provider));
    return Array.from(providerSet).sort();
  });

  // Filtered models
  const filteredModels = computed(() => {
    let result = models.value;

    // Filter by search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query)
      );
    }

    // Filter by provider
    if (selectedProvider.value) {
      result = result.filter(m => m.provider === selectedProvider.value);
    }

    return result;
  });

  // Group by provider
  const groupedModels = computed(() => {
    const groups: Record<string, ModelWithMeta[]> = {};

    for (const model of filteredModels.value) {
      if (!groups[model.provider]) {
        groups[model.provider] = [];
      }
      groups[model.provider].push(model);
    }

    return groups;
  });

  return {
    models,
    loading,
    error,
    searchQuery,
    selectedProvider,
    toolsOnly,
    providers,
    filteredModels,
    groupedModels,
    fetchModels,
  };
}
```

---

### Task 7.4: Create Model Card Component

**Create `components/models/ModelCard.vue`:**

```vue
<template>
  <div
    class="model-card"
    :class="{ selected: isSelected }"
    @click="$emit('select')"
  >
    <div class="model-header">
      <h3 class="model-name">{{ model.name }}</h3>
      <span v-if="model.supportsTools" class="tools-badge" title="Supports tool calling">
        Tools
      </span>
    </div>

    <div class="model-id">{{ model.id }}</div>

    <p v-if="model.description" class="model-description">
      {{ truncate(model.description, 100) }}
    </p>

    <div class="model-meta">
      <div class="meta-item">
        <span class="meta-label">Context</span>
        <span class="meta-value">{{ formatNumber(model.context_length) }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Input</span>
        <span class="meta-value">${{ formatPrice(model.pricePerMillionInput) }}/M</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Output</span>
        <span class="meta-value">${{ formatPrice(model.pricePerMillionOutput) }}/M</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ModelWithMeta } from '~/types';

defineProps<{
  model: ModelWithMeta;
  isSelected?: boolean;
}>();

defineEmits<{
  select: [];
}>();

const truncate = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

const formatNumber = (num: number) => {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(0) + 'K';
  }
  return num.toString();
};

const formatPrice = (price: number) => {
  if (price === 0) return 'Free';
  if (price < 0.01) return price.toFixed(4);
  if (price < 1) return price.toFixed(2);
  return price.toFixed(2);
};
</script>

<style scoped>
.model-card {
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.1s;
  background: #fff;
}

.model-card:hover {
  border-color: #999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.model-card.selected {
  border-color: #000;
  background: #f8f8f8;
}

.model-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.model-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.tools-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 600;
}

.model-id {
  font-size: 12px;
  color: #666;
  font-family: monospace;
  margin-bottom: 8px;
}

.model-description {
  font-size: 13px;
  color: #444;
  line-height: 1.4;
  margin-bottom: 12px;
}

.model-meta {
  display: flex;
  gap: 16px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 10px;
  color: #999;
  text-transform: uppercase;
}

.meta-value {
  font-size: 13px;
  font-weight: 500;
}
</style>
```

---

### Task 7.5: Create Model Filters Component

**Create `components/models/ModelFilters.vue`:**

```vue
<template>
  <div class="model-filters">
    <div class="filter-group">
      <input
        type="text"
        :value="searchQuery"
        placeholder="Search models..."
        @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="filter-group">
      <select
        :value="selectedProvider"
        @change="$emit('update:selectedProvider', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">All Providers</option>
        <option v-for="provider in providers" :key="provider" :value="provider">
          {{ formatProvider(provider) }}
        </option>
      </select>
    </div>

    <div class="filter-group">
      <label class="checkbox-label">
        <input
          type="checkbox"
          :checked="toolsOnly"
          @change="$emit('update:toolsOnly', ($event.target as HTMLInputElement).checked)"
        />
        Tools support only
      </label>
    </div>

    <div class="filter-results">
      {{ modelCount }} models
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  searchQuery: string;
  selectedProvider: string;
  toolsOnly: boolean;
  providers: string[];
  modelCount: number;
}>();

defineEmits<{
  'update:searchQuery': [value: string];
  'update:selectedProvider': [value: string];
  'update:toolsOnly': [value: boolean];
}>();

const formatProvider = (provider: string) => {
  // Capitalize first letter
  return provider.charAt(0).toUpperCase() + provider.slice(1);
};
</script>

<style scoped>
.model-filters {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  flex-wrap: wrap;
}

.filter-group input[type="text"],
.filter-group select {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  min-width: 200px;
}

.filter-group input:focus,
.filter-group select:focus {
  outline: none;
  border-color: #000;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
}

.filter-results {
  margin-left: auto;
  font-size: 14px;
  color: #666;
}
</style>
```

---

### Task 7.6: Create Models Page

**Create `pages/models.vue`:**

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

    <div class="models-page">
      <header class="models-header">
        <h1>Models</h1>
        <p>Select an AI model for your conversations</p>
      </header>

      <ModelFilters
        v-model:searchQuery="searchQuery"
        v-model:selectedProvider="selectedProvider"
        v-model:toolsOnly="toolsOnly"
        :providers="providers"
        :model-count="filteredModels.length"
      />

      <div v-if="loading" class="loading">
        Loading models...
      </div>

      <div v-else-if="error" class="error">
        {{ error }}
      </div>

      <div v-else class="models-grid">
        <div
          v-for="(models, provider) in groupedModels"
          :key="provider"
          class="provider-group"
        >
          <h2 class="provider-name">{{ formatProvider(provider) }}</h2>
          <div class="provider-models">
            <ModelCard
              v-for="model in models"
              :key="model.id"
              :model="model"
              :is-selected="model.id === currentModel"
              @select="handleSelectModel(model.id)"
            />
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
const router = useRouter();

const {
  loading,
  error,
  searchQuery,
  selectedProvider,
  toolsOnly,
  providers,
  filteredModels,
  groupedModels,
  fetchModels,
} = useModels();

const { settings, fetchSettings, updateSetting } = useSettings();

const {
  conversations,
  loading: loadingConversations,
  fetchConversations,
  createConversation,
  deleteConversation,
} = useConversations();

const currentModel = computed(() => settings.value.model);

const handleSelectModel = async (modelId: string) => {
  await updateSetting('model', modelId);
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

const formatProvider = (provider: string) => {
  return provider.charAt(0).toUpperCase() + provider.slice(1);
};

onMounted(async () => {
  await Promise.all([
    fetchModels(),
    fetchSettings(),
    fetchConversations(),
  ]);
});
</script>

<style scoped>
.models-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.models-header {
  padding: 24px 24px 0;
}

.models-header h1 {
  font-size: 24px;
  margin: 0 0 4px;
}

.models-header p {
  color: #666;
  margin: 0;
}

.models-page > :deep(.model-filters) {
  padding: 16px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.loading,
.error {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #666;
}

.error {
  color: #c62828;
}

.models-grid {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.provider-group {
  margin-bottom: 32px;
}

.provider-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.provider-models {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}
</style>
```

---

## Acceptance Criteria

- [ ] Models page loads and shows models from OpenRouter
- [ ] Can search models by name
- [ ] Can filter by provider
- [ ] Can filter to tools-only models
- [ ] Clicking a model selects it as the current model
- [ ] Selected model is highlighted
- [ ] Selected model is saved to settings
- [ ] Model prices and context length are displayed

---

## Testing

1. **Test model loading:**
   - Go to /models
   - Should see list of models grouped by provider

2. **Test filters:**
   - Search for "claude"
   - Should filter to Claude models only
   - Select "anthropic" from provider dropdown
   - Should show only Anthropic models

3. **Test selection:**
   - Click on a model
   - Should be highlighted
   - Go to settings
   - Should show selected model

4. **Test in chat:**
   - Select a different model
   - Start new chat
   - Ask "what model are you?"
   - Should respond with correct model name

---

## Files Created/Modified

```
types/
└── index.ts                  # MODIFIED (model types)

server/api/
└── models/
    └── index.get.ts          # NEW

composables/
└── useModels.ts              # NEW

components/models/
├── ModelCard.vue             # NEW
└── ModelFilters.vue          # NEW

pages/
└── models.vue                # NEW
```

---

## Next Phase

Once Phase 7 is complete, proceed to **Phase 8: Polish** for final improvements.

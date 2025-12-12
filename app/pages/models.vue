<template>
  <div class="models-page">
    <header class="page-header">
      <h1>Models</h1>
      <p>Browse and select AI models from OpenRouter</p>
    </header>

    <ModelsModelFilters
      :model-filters="filters"
      :providers="providerInfo"
      :stats="stats"
      @update:search="filters.search = $event"
      @update:sort-by="filters.sortBy = $event"
      @toggle-provider="toggleProvider"
      @set-capability="setCapabilityFilter"
      @reset="resetFilters"
    />

    <ModelsModelList
      :grouped-models="groupedModels"
      :selected-model-id="currentModelId"
      :loading="loading"
      :error="error"
      :pinned-models="pinnedModels"
      @select="handleStartChat"
      @retry="fetchModels({ force: true })"
      @reset-filters="resetFilters"
      @toggle-pin="togglePin"
    />
  </div>
</template>

<script setup lang="ts">
// Page meta
definePageMeta({
  layout: 'default',
});

const router = useRouter();

// Get shared models state
const {
  loading,
  error,
  filters,
  groupedModels,
  providerInfo,
  stats,
  fetchModels,
  resetFilters,
  setCapabilityFilter,
  toggleProvider,
} = useModels();

// Get pinned models state
const { pinnedModels, togglePin } = usePinnedModels();

// Get settings for current model
const { settings, updateSettings } = useSettings();

// Get conversations for creating new chats
const { createConversation } = useConversations();

// Current selected model from settings
const currentModelId = computed(() => settings.value.model);

// Handle clicking a model - create conversation and navigate
async function handleStartChat(modelId: string) {
  try {
    const conversation = await createConversation({ model: modelId });
    router.push(`/chat/${conversation.id}`);
  } catch (err) {
    console.error('[Models] Failed to start chat:', err);
  }
}

// Fetch models on mount
onMounted(() => {
  fetchModels();
});
</script>

<style scoped>
.models-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.page-header {
  padding: 24px 24px 0;
  flex-shrink: 0;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px;
}

.page-header p {
  color: #666;
  margin: 0;
  font-size: 14px;
}

/* Filter component gets horizontal padding */
.models-page :deep(.model-filters) {
  padding-left: 24px;
  padding-right: 24px;
}
</style>

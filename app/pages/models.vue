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
      @select="handleSelectModel"
      @retry="fetchModels({ force: true })"
      @reset-filters="resetFilters"
    />
  </div>
</template>

<script setup lang="ts">
// Page meta
definePageMeta({
  layout: 'default',
});

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

// Current selected model from settings or default
const currentModelId = ref('anthropic/claude-sonnet-4');

// Handle model selection
async function handleSelectModel(modelId: string) {
  currentModelId.value = modelId;
  // TODO: Save to settings when useSettings is available
  console.log('[Models] Selected:', modelId);
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

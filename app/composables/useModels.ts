import type {
  Model,
  ModelFilters,
  ModelsApiResponse,
  ModelSortOption,
  ProviderInfo
} from '~/types';
import { getProviderDisplayName } from '~/utils/providers';

/**
 * Default filter state
 */
const defaultFilters: ModelFilters = {
  search: '',
  providers: [],
  capabilities: {
    tools: null,
    vision: null,
    reasoning: null,
    free: null,
  },
  sortBy: 'provider',
};

/**
 * Composable for managing model list state
 * Uses useState for SSR-safe shared state across components
 */
export function useModels() {
  // ============================================
  // STATE (SSR-safe with useState)
  // ============================================

  /** All models from API */
  const models = useState<Model[]>('models-list', () => []);

  /** All unique providers */
  const providers = useState<string[]>('models-providers', () => []);

  /** Loading state */
  const loading = useState<boolean>('models-loading', () => false);

  /** Error message if fetch failed */
  const error = useState<string | null>('models-error', () => null);

  /** Whether initial fetch has completed */
  const hasFetched = useState<boolean>('models-fetched', () => false);

  /** Timestamp when data was cached */
  const cachedAt = useState<string | null>('models-cached-at', () => null);

  // ============================================
  // FILTERS (local reactive state, not shared)
  // ============================================

  const filters = reactive<ModelFilters>({ ...defaultFilters });

  // ============================================
  // COMPUTED: Filtered models
  // ============================================

  const filteredModels = computed(() => {
    let result = [...models.value];

    // 1. Search filter
    if (filters.search.trim()) {
      const query = filters.search.toLowerCase().trim();
      result = result.filter(model =>
        model.id.toLowerCase().includes(query) ||
        model.name.toLowerCase().includes(query) ||
        model.description?.toLowerCase().includes(query) ||
        model.provider.toLowerCase().includes(query)
      );
    }

    // 2. Provider filter
    if (filters.providers.length > 0) {
      result = result.filter(model =>
        filters.providers.includes(model.provider)
      );
    }

    // 3. Capability filters
    const { tools, vision, reasoning, free } = filters.capabilities;

    if (tools === true) {
      result = result.filter(m => m.capabilities.supportsTools);
    } else if (tools === false) {
      result = result.filter(m => !m.capabilities.supportsTools);
    }

    if (vision === true) {
      result = result.filter(m => m.capabilities.supportsVision);
    } else if (vision === false) {
      result = result.filter(m => !m.capabilities.supportsVision);
    }

    if (reasoning === true) {
      result = result.filter(m => m.capabilities.supportsReasoning);
    } else if (reasoning === false) {
      result = result.filter(m => !m.capabilities.supportsReasoning);
    }

    if (free === true) {
      result = result.filter(m => m.pricing.isFree);
    } else if (free === false) {
      result = result.filter(m => !m.pricing.isFree);
    }

    // 4. Sort
    result = sortModels(result, filters.sortBy);

    return result;
  });

  // ============================================
  // COMPUTED: Grouped by provider
  // ============================================

  const groupedModels = computed(() => {
    const groups: Record<string, Model[]> = {};

    for (const model of filteredModels.value) {
      if (!groups[model.provider]) {
        groups[model.provider] = [];
      }
      groups[model.provider]!.push(model);
    }

    // Sort groups by provider name
    const sortedGroups: Record<string, Model[]> = {};
    const sortedKeys = Object.keys(groups).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );

    for (const key of sortedKeys) {
      sortedGroups[key] = groups[key]!;
    }

    return sortedGroups;
  });

  // ============================================
  // COMPUTED: Provider info for filters
  // ============================================

  const providerInfo = computed<ProviderInfo[]>(() => {
    const counts: Record<string, number> = {};

    for (const model of models.value) {
      counts[model.provider] = (counts[model.provider] || 0) + 1;
    }

    return providers.value.map(id => ({
      id,
      displayName: getProviderDisplayName(id),
      modelCount: counts[id] || 0,
    }));
  });

  // ============================================
  // COMPUTED: Stats
  // ============================================

  const stats = computed(() => ({
    total: models.value.length,
    filtered: filteredModels.value.length,
    withTools: models.value.filter(m => m.capabilities.supportsTools).length,
    withVision: models.value.filter(m => m.capabilities.supportsVision).length,
    free: models.value.filter(m => m.pricing.isFree).length,
  }));

  // ============================================
  // METHODS
  // ============================================

  /**
   * Fetch models from API
   */
  async function fetchModels(options?: { force?: boolean }) {
    // Skip if already fetched (unless forced)
    if (hasFetched.value && !options?.force) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const params = options?.force ? '?refresh=true' : '';
      const response = await $fetch<ModelsApiResponse>(`/api/models${params}`);

      models.value = response.models;
      providers.value = response.providers;
      cachedAt.value = response.cachedAt;
      hasFetched.value = true;

    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch models';
      console.error('[useModels] Fetch error:', e);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Find model by ID
   */
  function getModelById(id: string): Model | undefined {
    return models.value.find(m => m.id === id);
  }

  /**
   * Reset filters to default
   */
  function resetFilters() {
    Object.assign(filters, { ...defaultFilters });
  }

  /**
   * Set a single capability filter
   */
  function setCapabilityFilter(
    capability: keyof ModelFilters['capabilities'],
    value: boolean | null
  ) {
    filters.capabilities[capability] = value;
  }

  /**
   * Toggle provider in filter
   */
  function toggleProvider(providerId: string) {
    const index = filters.providers.indexOf(providerId);
    if (index === -1) {
      filters.providers.push(providerId);
    } else {
      filters.providers.splice(index, 1);
    }
  }

  // ============================================
  // RETURN
  // ============================================

  return {
    // State (mutable for ModelSelector compatibility)
    models,
    providers: readonly(providers),
    loading: readonly(loading),
    error: readonly(error),
    hasFetched: readonly(hasFetched),
    cachedAt: readonly(cachedAt),

    // Filters (mutable)
    filters,

    // Computed
    filteredModels,
    groupedModels,
    providerInfo,
    stats,

    // Methods
    fetchModels,
    getModelById,
    resetFilters,
    setCapabilityFilter,
    toggleProvider,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function sortModels(models: Model[], sortBy: ModelSortOption): Model[] {
  const sorted = [...models];

  switch (sortBy) {
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case 'price-asc':
      return sorted.sort((a, b) =>
        a.pricing.promptPerMillion - b.pricing.promptPerMillion
      );
    case 'price-desc':
      return sorted.sort((a, b) =>
        b.pricing.promptPerMillion - a.pricing.promptPerMillion
      );
    case 'context-asc':
      return sorted.sort((a, b) => a.contextLength - b.contextLength);
    case 'context-desc':
      return sorted.sort((a, b) => b.contextLength - a.contextLength);
    case 'newest':
      return sorted.sort((a, b) =>
        (b.createdAt || 0) - (a.createdAt || 0)
      );
    case 'provider':
    default:
      return sorted.sort((a, b) => {
        const providerCompare = a.provider.localeCompare(b.provider);
        if (providerCompare !== 0) return providerCompare;
        return a.name.localeCompare(b.name);
      });
  }
}


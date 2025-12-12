import type { ModelProvider, ProvidersApiResponse } from '~/types';

/**
 * Composable for fetching and managing provider data for models
 */
export function useProviders() {
  // Cache of providers by model ID
  const providersCache = useState<Record<string, ModelProvider[]>>('providers-cache', () => ({}));

  // Loading state per model
  const loadingModels = useState<Set<string>>('providers-loading', () => new Set());

  // Models that have been "seen" (user has viewed providers for them)
  const seenModels = useState<Set<string>>('providers-seen', () => new Set());

  // Error state
  const error = ref<string | null>(null);

  /**
   * Fetch providers for a specific model
   */
  async function fetchProviders(modelId: string, forceRefresh = false): Promise<ModelProvider[]> {
    // Return cached if available and not forcing refresh
    if (!forceRefresh && providersCache.value[modelId]) {
      return providersCache.value[modelId];
    }

    // Prevent duplicate requests
    if (loadingModels.value.has(modelId)) {
      // Wait for existing request to complete
      while (loadingModels.value.has(modelId)) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return providersCache.value[modelId] || [];
    }

    loadingModels.value.add(modelId);
    error.value = null;

    try {
      const response = await $fetch<ProvidersApiResponse>(
        `/api/providers/${encodeURIComponent(modelId)}`
      );

      providersCache.value[modelId] = response.providers;
      return response.providers;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch providers';
      console.error(`[useProviders] Error fetching providers for ${modelId}:`, e);
      return [];
    } finally {
      loadingModels.value.delete(modelId);
    }
  }

  /**
   * Get cached providers for a model (returns empty array if not cached)
   */
  function getCachedProviders(modelId: string): ModelProvider[] {
    return providersCache.value[modelId] || [];
  }

  /**
   * Check if providers are currently loading for a model
   */
  function isLoading(modelId: string): boolean {
    return loadingModels.value.has(modelId);
  }

  /**
   * Mark a model as "seen" (user has viewed its providers)
   */
  function markModelSeen(modelId: string): void {
    seenModels.value.add(modelId);
  }

  /**
   * Check if user has seen providers for a model before
   */
  function hasSeenModel(modelId: string): boolean {
    return seenModels.value.has(modelId);
  }

  /**
   * Check if we should auto-open the provider panel for a model
   * Returns true if the model hasn't been seen before
   */
  function shouldAutoOpenPanel(modelId: string): boolean {
    return !seenModels.value.has(modelId);
  }

  /**
   * Clear the providers cache (useful for forcing refresh)
   */
  function clearCache(): void {
    providersCache.value = {};
  }

  return {
    // State
    providersCache: readonly(providersCache),
    error: readonly(error),

    // Methods
    fetchProviders,
    getCachedProviders,
    isLoading,
    markModelSeen,
    hasSeenModel,
    shouldAutoOpenPanel,
    clearCache,
  };
}

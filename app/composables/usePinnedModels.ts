/**
 * Composable for managing pinned/starred models
 * Provides reactive state and methods for pinning/unpinning models
 */
export function usePinnedModels() {
  const { settings, updateSettings } = useSettings();

  /**
   * List of pinned model IDs
   */
  const pinnedModels = computed(() => settings.value.pinnedModels || []);

  /**
   * Check if a model is pinned
   */
  function isPinned(modelId: string): boolean {
    return pinnedModels.value.includes(modelId);
  }

  /**
   * Toggle pin state for a model
   */
  async function togglePin(modelId: string) {
    const current = [...pinnedModels.value];
    const index = current.indexOf(modelId);

    if (index === -1) {
      current.push(modelId);
    } else {
      current.splice(index, 1);
    }

    await updateSettings({ pinnedModels: current });
  }

  /**
   * Pin a model (if not already pinned)
   */
  async function pinModel(modelId: string) {
    if (!isPinned(modelId)) {
      await updateSettings({ pinnedModels: [...pinnedModels.value, modelId] });
    }
  }

  /**
   * Unpin a model (if currently pinned)
   */
  async function unpinModel(modelId: string) {
    if (isPinned(modelId)) {
      await updateSettings({
        pinnedModels: pinnedModels.value.filter(id => id !== modelId)
      });
    }
  }

  return {
    pinnedModels,
    isPinned,
    togglePin,
    pinModel,
    unpinModel,
  };
}

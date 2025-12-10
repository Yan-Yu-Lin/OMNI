import { defaultSettings, type Settings } from '~/types';

export function useSettings() {
  // Use useState for SSR-safe shared state across components
  const settings = useState<Settings>('settings', () => ({ ...defaultSettings }));
  const loading = useState<boolean>('settings-loading', () => false);
  const error = useState<string | null>('settings-error', () => null);
  const hasFetched = useState<boolean>('settings-fetched', () => false);

  // Fetch settings from API (with guard against redundant fetches)
  const fetchSettings = async (force = false) => {
    // Skip if already fetched (unless forced)
    if (hasFetched.value && !force) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const data = await $fetch<Settings>('/api/settings');
      settings.value = data;
      hasFetched.value = true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch settings';
      console.error('Failed to fetch settings:', e);
    } finally {
      loading.value = false;
    }
  };

  // Update settings (partial update)
  const updateSettings = async (partial: Partial<Settings>) => {
    try {
      const updated = await $fetch<Settings>('/api/settings', {
        method: 'PUT',
        body: partial,
      });
      settings.value = updated;
    } catch (e) {
      console.error('Failed to update settings:', e);
      throw e;
    }
  };

  // Convenience computed for default model
  const defaultModel = computed(() => settings.value.model);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings,
    defaultModel,
  };
}

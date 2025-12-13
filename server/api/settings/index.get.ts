import db from '../../db';
import { defaultSettings, type Settings } from '~/types';

interface SettingsRecord {
  key: string;
  value: string;
}

export default defineEventHandler(async () => {
  // Read all settings from database
  const records = db.prepare(`
    SELECT key, value FROM settings
  `).all() as SettingsRecord[];

  // Start with defaults and merge in stored values
  const settings: Settings = { ...defaultSettings };

  // Define keys that are strings (not in defaults but valid)
  // lastActiveModel is deprecated but kept for backward compatibility
  const stringOnlyKeys = new Set(['lastActiveModel']);

  for (const record of records) {
    const key = record.key as keyof Settings;

    // Handle keys that exist in defaults
    if (key in defaultSettings) {
      // Parse the value based on the default type
      const defaultValue = defaultSettings[key];
      if (typeof defaultValue === 'number') {
        settings[key] = parseFloat(record.value) as never;
      } else if (Array.isArray(defaultValue)) {
        try {
          settings[key] = JSON.parse(record.value) as never;
        } catch {
          settings[key] = defaultValue as never;
        }
      } else if (typeof defaultValue === 'object' && defaultValue !== null) {
        try {
          settings[key] = JSON.parse(record.value) as never;
        } catch {
          settings[key] = defaultValue as never;
        }
      } else {
        settings[key] = record.value as never;
      }
    }
    // Handle string-only keys not in defaults (like lastActiveModel)
    else if (stringOnlyKeys.has(key)) {
      settings[key] = record.value as never;
    }
  }

  // Fallback: if lastUsed is still default but lastActiveModel exists, construct lastUsed from it
  // This handles the case where DB has lastActiveModel but migration hasn't run yet
  if (
    settings.lastUsed?.model === defaultSettings.lastUsed?.model &&
    settings.lastActiveModel &&
    settings.lastActiveModel !== defaultSettings.model
  ) {
    // Get provider from modelProviderPreferences if available
    let provider = 'auto';
    const modelPrefs = settings.modelProviderPreferences?.[settings.lastActiveModel];
    if (modelPrefs?.mode === 'specific' && modelPrefs?.provider) {
      provider = modelPrefs.provider;
    }
    settings.lastUsed = {
      model: settings.lastActiveModel,
      provider,
    };
  }

  return settings;
});

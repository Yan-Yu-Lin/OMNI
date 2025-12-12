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

  for (const record of records) {
    const key = record.key as keyof Settings;
    if (key in settings) {
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
  }

  return settings;
});

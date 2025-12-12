import db from '../../db';
import { defaultSettings, type Settings } from '~/types';

interface SettingsRecord {
  key: string;
  value: string;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<Settings>>(event);

  if (!body || Object.keys(body).length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No settings to update',
    });
  }

  // Upsert each key-value pair
  const upsertStmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `);

  for (const [key, value] of Object.entries(body)) {
    if (key in defaultSettings) {
      // Convert value to string for storage
      let stringValue: string;
      if (typeof value === 'number') {
        stringValue = String(value);
      } else if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        stringValue = JSON.stringify(value);
      } else {
        stringValue = value as string;
      }
      upsertStmt.run(key, stringValue);
    }
  }

  // Return updated settings
  const records = db.prepare(`
    SELECT key, value FROM settings
  `).all() as SettingsRecord[];

  const settings: Settings = { ...defaultSettings };

  for (const record of records) {
    const recordKey = record.key as keyof Settings;
    if (recordKey in settings) {
      const defaultValue = defaultSettings[recordKey];
      if (typeof defaultValue === 'number') {
        settings[recordKey] = parseFloat(record.value) as never;
      } else if (Array.isArray(defaultValue)) {
        try {
          settings[recordKey] = JSON.parse(record.value) as never;
        } catch {
          settings[recordKey] = defaultValue as never;
        }
      } else if (typeof defaultValue === 'object' && defaultValue !== null) {
        try {
          settings[recordKey] = JSON.parse(record.value) as never;
        } catch {
          settings[recordKey] = defaultValue as never;
        }
      } else {
        settings[recordKey] = record.value as never;
      }
    }
  }

  return settings;
});

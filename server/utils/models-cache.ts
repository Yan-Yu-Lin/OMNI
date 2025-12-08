import db from '../db';

// Cache TTL in seconds (1 hour)
const CACHE_TTL = 60 * 60;

interface CacheRow {
  key: string;
  value: string;
  expires_at: string;
  created_at: string;
}

/**
 * Get cached value if not expired
 */
export function getCacheValue<T>(key: string): T | null {
  try {
    const row = db.prepare(`
      SELECT value, expires_at
      FROM cache
      WHERE key = ? AND expires_at > datetime('now')
    `).get(key) as CacheRow | undefined;

    if (!row) {
      return null;
    }

    return JSON.parse(row.value) as T;
  } catch (error) {
    console.error('[Cache] Error reading cache:', error);
    return null;
  }
}

/**
 * Set cache value with TTL
 */
export function setCacheValue<T>(key: string, value: T, ttlSeconds = CACHE_TTL): void {
  try {
    const valueJson = JSON.stringify(value);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO cache (key, value, expires_at, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(key, valueJson, expiresAt);
  } catch (error) {
    console.error('[Cache] Error writing cache:', error);
  }
}

/**
 * Delete cache entry
 */
export function deleteCacheValue(key: string): void {
  try {
    db.prepare('DELETE FROM cache WHERE key = ?').run(key);
  } catch (error) {
    console.error('[Cache] Error deleting cache:', error);
  }
}

/**
 * Clean expired cache entries
 */
export function cleanExpiredCache(): number {
  try {
    const result = db.prepare(`
      DELETE FROM cache WHERE expires_at <= datetime('now')
    `).run();
    return result.changes;
  } catch (error) {
    console.error('[Cache] Error cleaning cache:', error);
    return 0;
  }
}

/**
 * Get cache metadata (for debugging/monitoring)
 */
export function getCacheInfo(key: string): { exists: boolean; expiresAt: string | null; age: number | null } {
  try {
    const row = db.prepare(`
      SELECT expires_at, created_at FROM cache WHERE key = ?
    `).get(key) as { expires_at: string; created_at: string } | undefined;

    if (!row) {
      return { exists: false, expiresAt: null, age: null };
    }

    const createdAt = new Date(row.created_at).getTime();
    const age = Math.floor((Date.now() - createdAt) / 1000);

    return {
      exists: true,
      expiresAt: row.expires_at,
      age,
    };
  } catch (error) {
    return { exists: false, expiresAt: null, age: null };
  }
}

import type { OpenRouterModel, ModelsApiResponse } from '~/types';
import { getCacheValue, setCacheValue } from '../../utils/models-cache';
import { transformModels } from '../../utils/models-transform';

const CACHE_KEY = 'openrouter_models';
const OPENROUTER_API = 'https://openrouter.ai/api/v1/models';

export default defineEventHandler(async (event): Promise<ModelsApiResponse> => {
  const query = getQuery(event);
  const forceRefresh = query.refresh === 'true';

  // Try cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getCacheValue<ModelsApiResponse>(CACHE_KEY);
    if (cached) {
      console.log('[Models API] Returning cached data');
      return { ...cached, fromCache: true };
    }
  }

  // Fetch from OpenRouter
  console.log('[Models API] Fetching from OpenRouter...');

  try {
    const response = await fetch(OPENROUTER_API, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AI-Chat-App/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { data: OpenRouterModel[] };
    const rawModels = data.data || [];

    console.log(`[Models API] Received ${rawModels.length} models`);

    // Transform models
    const { models, providers } = transformModels(rawModels);

    // Build response
    const apiResponse: ModelsApiResponse = {
      models,
      providers,
      totalCount: models.length,
      cachedAt: new Date().toISOString(),
      fromCache: false,
    };

    // Cache the response
    setCacheValue(CACHE_KEY, apiResponse);

    return apiResponse;

  } catch (error) {
    console.error('[Models API] Error fetching models:', error);

    // Try to return stale cache on error
    const staleCache = getCacheValue<ModelsApiResponse>(CACHE_KEY);
    if (staleCache) {
      console.log('[Models API] Returning stale cache due to error');
      return { ...staleCache, fromCache: true };
    }

    throw createError({
      statusCode: 502,
      message: 'Failed to fetch models from OpenRouter',
    });
  }
});

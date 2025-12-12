import type { ProvidersApiResponse } from '~/types';
import { fetchModelProviders } from '../../utils/providers';
import { getCacheValue, setCacheValue } from '../../utils/models-cache';

const CACHE_TTL = 60 * 30; // 30 minutes (shorter than models cache since uptime changes)

export default defineEventHandler(async (event): Promise<ProvidersApiResponse> => {
  const model = getRouterParam(event, 'model');

  if (!model) {
    throw createError({
      statusCode: 400,
      message: 'Model ID is required',
    });
  }

  // Decode the model ID (it may be URL-encoded)
  const modelId = decodeURIComponent(model);

  // Check cache first
  const cacheKey = `providers:${modelId}`;
  const cached = getCacheValue<ProvidersApiResponse>(cacheKey);

  if (cached) {
    console.log(`[Providers API] Cache hit for ${modelId}`);
    return cached;
  }

  console.log(`[Providers API] Fetching providers for ${modelId}`);

  try {
    const providers = await fetchModelProviders(modelId);

    const response: ProvidersApiResponse = {
      modelId,
      providers,
      count: providers.length,
    };

    // Cache the response
    setCacheValue(cacheKey, response, CACHE_TTL);

    return response;
  } catch (error) {
    console.error(`[Providers API] Error fetching providers for ${modelId}:`, error);

    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to fetch providers',
    });
  }
});

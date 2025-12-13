import { OpenRouter } from '@openrouter/sdk';
import type { ModelProvider } from '~/types';

let openRouterSDK: OpenRouter | null = null;

/**
 * Get or create OpenRouter SDK instance
 */
function getOpenRouterSDK(): OpenRouter {
  if (!openRouterSDK) {
    const config = useRuntimeConfig();

    if (!config.openrouterApiKey) {
      throw new Error('NUXT_OPENROUTER_API_KEY is not configured');
    }

    openRouterSDK = new OpenRouter({
      apiKey: config.openrouterApiKey,
    });
  }

  return openRouterSDK;
}

/**
 * Fetch available providers/endpoints for a specific model from OpenRouter
 */
export async function fetchModelProviders(modelId: string): Promise<ModelProvider[]> {
  const sdk = getOpenRouterSDK();

  // Parse model ID into author/slug format
  const parts = modelId.split('/');
  if (parts.length < 2) {
    throw new Error(`Invalid model ID format: ${modelId}`);
  }

  const author = parts[0];
  const slug = parts.slice(1).join('/'); // Handle cases like "openai/gpt-4o-mini"

  const response = await sdk.endpoints.list({
    author,
    slug,
  });

  const endpoints = response.data?.endpoints || [];

  // Debug: log raw endpoint data to verify tag field
  if (endpoints.length > 0) {
    console.log('[Providers] Raw endpoint sample:', JSON.stringify({
      providerName: endpoints[0].providerName,
      tag: endpoints[0].tag,
    }));
  }

  return endpoints.map(transformEndpoint);
}

/**
 * Transform OpenRouter SDK endpoint to our ModelProvider type
 */
function transformEndpoint(endpoint: {
  providerName?: string;
  tag?: string;
  contextLength?: number;
  maxCompletionTokens?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
    inputCacheRead?: string;
    inputCacheWrite?: string;
  };
  supportsImplicitCaching?: boolean;
  uptimeLast30m?: number;
}): ModelProvider {
  const promptPrice = parseFloat(endpoint.pricing?.prompt || '0');
  const completionPrice = parseFloat(endpoint.pricing?.completion || '0');
  const cacheReadPrice = endpoint.pricing?.inputCacheRead
    ? parseFloat(endpoint.pricing.inputCacheRead)
    : undefined;
  const cacheWritePrice = endpoint.pricing?.inputCacheWrite
    ? parseFloat(endpoint.pricing.inputCacheWrite)
    : undefined;

  // Convert from per-token to per-million-tokens
  const MILLION = 1_000_000;

  // Use tag directly - this is the actual routing slug OpenRouter expects
  // e.g., "google-vertex" not normalized "google" from provider_name "Google"
  const slug = endpoint.tag || normalizeProviderSlug(endpoint.providerName || 'unknown');

  return {
    name: endpoint.providerName || 'Unknown',
    slug,
    pricing: {
      prompt: promptPrice * MILLION,
      completion: completionPrice * MILLION,
      cacheRead: cacheReadPrice ? cacheReadPrice * MILLION : undefined,
      cacheWrite: cacheWritePrice ? cacheWritePrice * MILLION : undefined,
    },
    supportsCaching: endpoint.supportsImplicitCaching || false,
    uptime: endpoint.uptimeLast30m ?? 100,
    contextLength: endpoint.contextLength || 0,
    maxCompletionTokens: endpoint.maxCompletionTokens,
  };
}

/**
 * Convert provider display name to slug format for API routing
 * e.g., "Amazon Bedrock" -> "amazon-bedrock"
 */
function normalizeProviderSlug(providerName: string): string {
  return providerName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

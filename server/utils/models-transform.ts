import type { OpenRouterModel, Model, ModelCapabilities, ModelPricing } from '~/types';

// Providers known to support tool calling
const TOOL_SUPPORTING_PROVIDERS = new Set([
  'anthropic',
  'openai',
  'google',
  'mistralai',
  'cohere',
  'fireworks',
  'groq',
]);

// Model ID patterns that indicate reasoning capabilities
const REASONING_PATTERNS = [
  /o1-/i,
  /o3-/i,
  /-thinking/i,
  /-reasoner/i,
  /deepseek.*r1/i,
  /qwq/i,
];

/**
 * Extract provider from model ID
 * e.g., "anthropic/claude-sonnet-4" -> "anthropic"
 */
export function extractProvider(modelId: string): string {
  const [provider] = modelId.split('/');
  return provider || 'unknown';
}

/**
 * Parse pricing string to number
 * OpenRouter returns prices as strings like "0.000003"
 */
export function parsePricing(priceString: string | undefined): number {
  if (!priceString) return 0;
  const price = parseFloat(priceString);
  return isNaN(price) ? 0 : price;
}

/**
 * Detect model capabilities from raw data
 */
export function detectCapabilities(model: OpenRouterModel): ModelCapabilities {
  const provider = extractProvider(model.id);
  const modality = model.architecture?.modality || '';
  const instructType = model.architecture?.instruct_type || '';

  // Tool support detection
  const supportsTools =
    TOOL_SUPPORTING_PROVIDERS.has(provider) ||
    instructType.includes('tool') ||
    instructType.includes('function') ||
    // Special case: check if model name suggests tool support
    model.name.toLowerCase().includes('instruct');

  // Vision support: check modality for image input
  const supportsVision = modality.includes('image');

  // Reasoning support: check ID patterns
  const supportsReasoning = REASONING_PATTERNS.some(pattern =>
    pattern.test(model.id) || pattern.test(model.name)
  );

  // JSON output: most instruct models support this
  const supportsJsonOutput = supportsTools || instructType.includes('json');

  return {
    supportsTools,
    supportsVision,
    supportsReasoning,
    supportsJsonOutput,
  };
}

/**
 * Transform pricing data
 */
export function transformPricing(model: OpenRouterModel): ModelPricing {
  const promptPerToken = parsePricing(model.pricing.prompt);
  const completionPerToken = parsePricing(model.pricing.completion);
  const imagePrice = model.pricing.image ? parsePricing(model.pricing.image) : null;

  return {
    promptPerMillion: promptPerToken * 1_000_000,
    completionPerMillion: completionPerToken * 1_000_000,
    imagePerUnit: imagePrice,
    isFree: promptPerToken === 0 && completionPerToken === 0,
  };
}

/**
 * Transform raw OpenRouter model to our Model type
 */
export function transformModel(raw: OpenRouterModel): Model {
  return {
    id: raw.id,
    name: raw.name,
    provider: extractProvider(raw.id),
    description: raw.description,
    contextLength: raw.context_length,
    maxCompletionTokens: raw.top_provider?.max_completion_tokens,
    pricing: transformPricing(raw),
    capabilities: detectCapabilities(raw),
    createdAt: raw.created,
    modality: raw.architecture?.modality,
  };
}

/**
 * Transform array of raw models and extract unique providers
 */
export function transformModels(rawModels: OpenRouterModel[]): {
  models: Model[];
  providers: string[];
} {
  const providerSet = new Set<string>();

  const models = rawModels.map(raw => {
    const model = transformModel(raw);
    providerSet.add(model.provider);
    return model;
  });

  // Sort providers alphabetically
  const providers = Array.from(providerSet).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  return { models, providers };
}

/**
 * Get display name for a provider
 */
export function getProviderDisplayName(providerId: string): string {
  const displayNames: Record<string, string> = {
    'anthropic': 'Anthropic',
    'openai': 'OpenAI',
    'google': 'Google',
    'meta-llama': 'Meta Llama',
    'mistralai': 'Mistral AI',
    'cohere': 'Cohere',
    'deepseek': 'DeepSeek',
    'qwen': 'Qwen',
    'perplexity': 'Perplexity',
    'together': 'Together AI',
    'fireworks': 'Fireworks',
    'groq': 'Groq',
    'ai21': 'AI21 Labs',
    'microsoft': 'Microsoft',
    'x-ai': 'xAI',
    'amazon': 'Amazon',
    'nvidia': 'NVIDIA',
    'databricks': 'Databricks',
  };

  return displayNames[providerId] ||
    providerId.charAt(0).toUpperCase() + providerId.slice(1);
}

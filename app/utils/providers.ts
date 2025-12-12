/**
 * Provider display name mappings
 * Single source of truth for provider ID -> display name conversion
 */
const providerDisplayNames: Record<string, string> = {
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
  'moonshotai': 'Moonshot AI',
};

/**
 * Get display name for a provider ID
 * @param providerId - Provider slug (e.g., "anthropic", "openai")
 * @returns Display name (e.g., "Anthropic", "OpenAI")
 */
export function getProviderDisplayName(providerId: string): string {
  return providerDisplayNames[providerId] ||
    providerId.charAt(0).toUpperCase() + providerId.slice(1);
}

import { createOpenRouter } from '@openrouter/ai-sdk-provider';

let openrouterClient: ReturnType<typeof createOpenRouter> | null = null;

export function getOpenRouterClient() {
  if (!openrouterClient) {
    const config = useRuntimeConfig();

    if (!config.openrouterApiKey) {
      throw new Error(
        'NUXT_OPENROUTER_API_KEY is not configured. Please set it in your .env file.'
      );
    }

    openrouterClient = createOpenRouter({
      apiKey: config.openrouterApiKey,
    });
  }

  return openrouterClient;
}

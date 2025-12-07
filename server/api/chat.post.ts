import {
  streamText,
  type UIMessage,
  convertToModelMessages,
  stepCountIs,
} from 'ai';
import { getOpenRouterClient } from '../utils/openrouter';
import { tools } from '../tools';

interface ChatRequestBody {
  messages: UIMessage[];
  conversationId?: string;
  model?: string;
}

const SYSTEM_PROMPT = `You are a helpful assistant with access to web tools.

Available tools:
- web_search: Search the web for current information. Returns results with full page content.
- scrape_url: Extract content from a specific URL. Use when you know the exact page.
- crawl_site: Crawl a website recursively to get content from multiple pages. Use for understanding a whole site or documentation.
- map_site: Discover all URLs on a website without scraping. Fast way to see site structure.

When to use tools:
- Use web_search for general questions needing current information
- Use scrape_url when given a specific URL to read
- Use crawl_site to explore documentation sites, blogs, or sections of a website
- Use map_site first if you need to find specific pages on a large site before crawling
- You can use multiple tools in sequence (e.g., map first to find pages, then crawl specific sections)

Always summarize the information you find in a helpful way for the user.`;

export default defineEventHandler(async (event) => {
  const body = await readBody<ChatRequestBody>(event);
  const { messages, model } = body;

  // Debug: Log what we received
  console.log('[Chat API] Received body:', JSON.stringify(body, null, 2));
  console.log('[Chat API] Messages type:', typeof messages, Array.isArray(messages));
  console.log('[Chat API] Messages count:', messages?.length);
  if (messages?.[0]) {
    console.log('[Chat API] First message:', JSON.stringify(messages[0], null, 2));
  }

  if (!messages || !Array.isArray(messages)) {
    throw createError({
      statusCode: 400,
      message: 'Messages array is required',
    });
  }

  const openrouter = getOpenRouterClient();

  // Use provided model or default
  const selectedModel = model || 'moonshotai/kimi-k2-0905';

  const result = streamText({
    model: openrouter(selectedModel, {
      // Route to Groq as the preferred provider for this model
      extraBody: {
        provider: {
          order: ['groq'],
          allow_fallbacks: true,
        },
      },
    }),
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(10), // Allow up to 10 tool steps for complex queries
  });

  return result.toUIMessageStreamResponse();
});

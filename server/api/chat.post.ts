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
- web_search: Search the web for current information. Use this when asked about recent events, news, or anything you need to look up.
- scrape_url: Extract content from a specific URL. Use this when you need to read the full content of a webpage.

When to use tools:
- Use web_search when the user asks for information that might be more recent than your training data
- Use scrape_url when given a specific URL to read
- You can use multiple tools in sequence if needed (e.g., search first, then scrape a specific result)

Always summarize the information you find in a helpful way for the user.`;

export default defineEventHandler(async (event) => {
  const body = await readBody<ChatRequestBody>(event);
  const { messages, model } = body;

  if (!messages || !Array.isArray(messages)) {
    throw createError({
      statusCode: 400,
      message: 'Messages array is required',
    });
  }

  const openrouter = getOpenRouterClient();

  // Use provided model or default
  const selectedModel = model || 'anthropic/claude-sonnet-4';

  const result = streamText({
    model: openrouter(selectedModel),
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(10), // Allow up to 10 tool steps for complex queries
  });

  return result.toUIMessageStreamResponse();
});

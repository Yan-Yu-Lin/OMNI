import {
  streamText,
  type UIMessage,
  convertToModelMessages,
  stepCountIs,
} from 'ai';
import { getOpenRouterClient } from '../utils/openrouter';
import { tools } from '../tools';
import {
  saveUserMessage,
  saveAssistantMessages,
  saveToolResults,
  setConversationStatus,
  autoGenerateTitle,
} from '../utils/chat-persistence';

interface ChatRequestBody {
  messages: UIMessage[];
  conversationId: string;
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
  const { messages, conversationId, model } = body;

  // Debug: Log what we received
  console.log('[Chat API] Received request for conversation:', conversationId);
  console.log('[Chat API] Messages count:', messages?.length);

  if (!messages || !Array.isArray(messages)) {
    throw createError({
      statusCode: 400,
      message: 'Messages array is required',
    });
  }

  if (!conversationId) {
    throw createError({
      statusCode: 400,
      message: 'Conversation ID is required',
    });
  }

  // Get the latest user message (the one being sent now)
  const userMessage = messages[messages.length - 1];
  if (!userMessage || userMessage.role !== 'user') {
    throw createError({
      statusCode: 400,
      message: 'Last message must be from user',
    });
  }

  // 1. Save the user message to DB first
  saveUserMessage(conversationId, userMessage);

  // Auto-generate title if this is the first message
  if (messages.length === 1) {
    autoGenerateTitle(conversationId, userMessage);
  }

  // 2. Set conversation status to streaming
  setConversationStatus(conversationId, 'streaming');

  const openrouter = getOpenRouterClient();

  // Use provided model or default
  const selectedModel = model || 'moonshotai/kimi-k2-0905';

  // 3. Start AI processing with callbacks (fire-and-forget)
  // The stream is consumed in the background via callbacks
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

    // Called after each step (tool call or text generation)
    onStepFinish: async ({ response }) => {
      console.log('[Chat API] Step finished, saving messages...');
      // Cast to unknown first then to our expected type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messages = response.messages as any[];
      // Save assistant messages (text and tool calls)
      saveAssistantMessages(conversationId, messages);
      // Save tool results if any
      saveToolResults(conversationId, messages);
    },

    // Called when the entire stream is complete
    onFinish: async ({ response }) => {
      console.log('[Chat API] Stream finished, finalizing...');
      // Cast to unknown first then to our expected type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messages = response.messages as any[];
      // Final save of all messages
      saveAssistantMessages(conversationId, messages);
      saveToolResults(conversationId, messages);
      // Set status back to idle
      setConversationStatus(conversationId, 'idle');
    },

    // Called when an error occurs
    onError: ({ error }) => {
      console.error('[Chat API] Stream error:', error);
      setConversationStatus(conversationId, 'error');
    },
  });

  // Consume the stream in the background (required for callbacks to fire)
  // We use the text promise which forces the stream to be fully consumed
  result.text.catch((err) => {
    console.error('[Chat API] Error consuming stream:', err);
    setConversationStatus(conversationId, 'error');
  });

  // 4. Return immediately (fire-and-forget)
  return { success: true, conversationId };
});

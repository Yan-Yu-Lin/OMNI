import {
  streamText,
  consumeStream,
  type UIMessage,
  convertToModelMessages,
  stepCountIs,
} from 'ai';
import { getOpenRouterClient } from '../utils/openrouter';
import { createAllTools } from '../tools';
import {
  saveUserMessage,
  saveAssistantMessages,
  saveToolResults,
  setConversationStatus,
  autoGenerateTitle,
} from '../utils/chat-persistence';
import db from '../db';
import { defaultSettings, type ProviderPreferences } from '~/types';

// Get default model from settings table, fallback to defaultSettings
function getDefaultModel(): string {
  try {
    const result = db.prepare('SELECT value FROM settings WHERE key = ?').get('model') as { value: string } | undefined;
    return result?.value || defaultSettings.model;
  } catch {
    return defaultSettings.model;
  }
}

interface ChatRequestBody {
  messages: UIMessage[];
  conversationId: string;
  model?: string;
  providerPreferences?: ProviderPreferences;
}

const SYSTEM_PROMPT = `You are a helpful assistant with access to web tools and a sandbox environment.

## Web Tools (for research and information gathering)
- web_search: Search the web for current information. Returns results with full page content.
- scrape_url: Extract content from a specific URL. Use when you know the exact page.
- crawl_site: Crawl a website recursively to get content from multiple pages.
- map_site: Discover all URLs on a website without scraping. Fast way to see site structure.

## Sandbox Tools (for code execution)
- sandbox_bash: Execute bash commands in an isolated Linux container.
  The container has Python 3, Node.js, git, curl, wget, and build tools.
  Use for running code, installing packages, compiling, or any shell command.
  Network access is available (pip install, npm install, curl work).

- sandbox_read: Read file contents from the sandbox container.
  Use to check file contents, verify output, or read generated files.

- sandbox_write: Write or create files in the sandbox container.
  Use to create scripts, config files, or any text file.
  Parent directories are created automatically.

Files in /workspace persist across messages in this conversation.

## When to use which tools:
- Use web tools for research, finding documentation, or current information
- Use sandbox tools when the user wants you to write/run code, create files, or execute commands
- You can combine both: search for documentation, then implement code in the sandbox

Always explain what you're doing and show relevant output to the user.`;

export default defineEventHandler(async (event) => {
  const body = await readBody<ChatRequestBody>(event);
  const { messages, conversationId, model, providerPreferences } = body;

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

  // Use provided model, or read default from settings
  const selectedModel = model || getDefaultModel();

  // Build provider options from preferences
  const providerOptions = providerPreferences ? {
    provider: {
      // If specific provider selected, put it first in order
      order: providerPreferences.mode === 'specific' && providerPreferences.provider
        ? [providerPreferences.provider]
        : undefined,
      // Sort strategy for auto mode
      sort: providerPreferences.mode === 'auto' ? providerPreferences.sort : undefined,
      // Allow fallbacks in auto mode
      allow_fallbacks: providerPreferences.mode === 'auto',
    },
  } : undefined;

  // 3. Create tools for this conversation (sandbox tools need conversationId)
  const tools = createAllTools(conversationId);

  // 4. Start AI streaming
  const result = streamText({
    model: openrouter(selectedModel, providerOptions),
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(10), // Allow up to 10 tool steps for complex queries

    // Called after each step - save tool results for partial progress
    onStepFinish: async ({ response }) => {
      console.log('[Chat API] Step finished');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msgs = response.messages as any[];
      // Save tool results during steps (for partial progress)
      saveToolResults(conversationId, msgs);
    },

    // Called when an error occurs during streaming
    onError: ({ error }) => {
      console.error('[Chat API] Stream error:', error);
      setConversationStatus(conversationId, 'error');
    },
  });

  // 5. Return the SDK's streaming response with server-side consumption
  // This "tees" the stream: one copy goes to browser, one is consumed server-side
  return result.toUIMessageStreamResponse({
    // Original messages for proper message ID handling
    originalMessages: messages,

    // consumeSseStream runs server-side INDEPENDENT of browser connection
    // Even if browser closes tab, this keeps running for persistence
    // Using SDK's consumeStream helper which properly removes backpressure
    consumeSseStream: consumeStream,

    // onFinish fires when stream completes (even if client disconnects)
    onFinish: async ({ responseMessage, isAborted }) => {
      console.log('[Chat API] Stream finished', { isAborted });

      // Convert the responseMessage parts to our format and save
      if (responseMessage && responseMessage.parts) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedParts: any[] = [];

        for (const part of responseMessage.parts) {
          if (part.type === 'text') {
            formattedParts.push({ type: 'text', text: part.text });
          } else if (part.type.startsWith('tool-')) {
            // Tool parts come through with type like 'tool-web_search'
            formattedParts.push(part);
          } else if (part.type === 'reasoning') {
            formattedParts.push({ type: 'reasoning', text: (part as { text: string }).text });
          }
        }

        // Create a mock response.messages array for saveAssistantMessages
        const mockMessages = [{
          id: responseMessage.id,
          role: 'assistant' as const,
          content: formattedParts.map(p => {
            if (p.type === 'text') {
              return { type: 'text', text: p.text };
            } else if (p.type.startsWith('tool-')) {
              // Extract toolName from type (e.g., 'tool-web_search' -> 'web_search')
              // Static tools in Vercel AI SDK don't have toolName property - it's embedded in type
              const toolName = p.toolName || p.type.replace('tool-', '');
              return {
                type: 'tool-call',
                toolCallId: p.toolCallId,
                toolName: toolName,
                args: p.input,
              };
            }
            return p;
          }),
        }];

        saveAssistantMessages(conversationId, mockMessages);

        // Also save any tool results
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolParts = responseMessage.parts.filter((p: any) =>
          p.type.startsWith('tool-') && p.state === 'output-available'
        );

        if (toolParts.length > 0) {
          const mockToolMessages = [{
            role: 'tool' as const,
            content: toolParts.map((p: { toolCallId: string; output: unknown }) => ({
              type: 'tool-result',
              toolCallId: p.toolCallId,
              result: p.output,
            })),
          }];
          saveToolResults(conversationId, mockToolMessages);
        }
      }

      // Set status back to idle (or error if aborted unexpectedly)
      setConversationStatus(conversationId, isAborted ? 'error' : 'idle');
    },

    // Handle errors during streaming
    onError: (error) => {
      console.error('[Chat API] toUIMessageStreamResponse error:', error);
      return 'An error occurred during streaming.';
    },
  });
});

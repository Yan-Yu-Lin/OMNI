// Re-export from ai package for convenience
export type { UIMessage } from 'ai';

// Conversation types
export type ConversationStatus = 'idle' | 'streaming' | 'error';

export interface Conversation {
  id: string;
  title: string;
  model: string | null;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: import('ai').UIMessage[];
}

// Settings types
export interface Settings {
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  firecrawlMode: 'self-hosted' | 'cloud';
  firecrawlSelfHostedUrl: string;
  firecrawlApiKey: string;
}

export const defaultSettings: Settings = {
  model: 'anthropic/claude-sonnet-4',
  systemPrompt: 'You are a helpful assistant.',
  temperature: 1,
  maxTokens: 4096,
  firecrawlMode: 'self-hosted',
  firecrawlSelfHostedUrl: 'http://localhost:3002',
  firecrawlApiKey: '',
};

// Chat request type
export interface ChatRequest {
  messages: import('ai').UIMessage[];
  conversationId?: string;
  model?: string;
}

// Tool input/output types
export interface WebSearchInput {
  query: string;
  limit?: number;
}

export interface WebSearchResult {
  url: string;
  title: string;
  description: string;
  markdown?: string;
}

export interface WebSearchOutput {
  results: WebSearchResult[];
}

export interface ScrapeUrlInput {
  url: string;
  onlyMainContent?: boolean;
}

export interface ScrapeUrlOutput {
  url: string;
  title: string;
  description: string;
  markdown: string;
  links?: string[];
}

// Crawl Site tool types
export interface CrawlSiteInput {
  url: string;
  limit?: number;
  maxDepth?: number;
}

export interface CrawlPage {
  url: string;
  title: string;
  markdown: string;
}

export interface CrawlSiteOutput {
  pagesFound: number;
  pages: CrawlPage[];
}

// Map Site tool types
export interface MapSiteInput {
  url: string;
  limit?: number;
  search?: string;
}

export interface MapSiteOutput {
  urlsFound: number;
  urls: string[];
}

// Tool state type
export type ToolState =
  | 'input-streaming'
  | 'input-available'
  | 'output-available'
  | 'output-error';

// Generic tool part interface
export interface ToolPart<TInput = unknown, TOutput = unknown> {
  type: string;
  toolCallId: string;
  toolName: string;
  state: ToolState;
  input?: TInput;
  output?: TOutput;
  errorText?: string;
}

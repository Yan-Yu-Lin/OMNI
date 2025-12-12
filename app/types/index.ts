// Re-export from ai package for convenience
export type { UIMessage } from 'ai';

// Provider preferences (defined early as it's referenced by Conversation and Settings)
/**
 * User's provider routing preferences
 */
export interface ProviderPreferences {
  /** Routing mode: 'auto' for OpenRouter routing, 'specific' for explicit provider */
  mode: 'auto' | 'specific';

  /** Provider slug when mode='specific' */
  provider?: string;

  /** Sort strategy when mode='auto': optimize for price, latency, or throughput */
  sort?: 'price' | 'latency' | 'throughput';
}

// Conversation types
export type ConversationStatus = 'idle' | 'streaming' | 'error';

export interface Conversation {
  id: string;
  title: string;
  model: string | null;
  providerPreferences?: ProviderPreferences;
  status: ConversationStatus;
  pinned: boolean;
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
  providerPreferences?: ProviderPreferences;
  pinnedModels: string[];
  /** Last model user actually sent a message with (set server-side) */
  lastActiveModel?: string;
  /** Per-model provider preferences (key: model ID, value: preferences) */
  modelProviderPreferences?: Record<string, ProviderPreferences>;
}

export const defaultSettings: Settings = {
  model: 'anthropic/claude-sonnet-4',
  systemPrompt: 'You are a helpful assistant.',
  temperature: 1,
  maxTokens: 4096,
  firecrawlMode: 'self-hosted',
  firecrawlSelfHostedUrl: 'http://localhost:3002',
  firecrawlApiKey: '',
  pinnedModels: [],
  providerPreferences: { mode: 'auto', sort: 'throughput' },
  modelProviderPreferences: {},
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

// =============================================================================
// SANDBOX TOOL TYPES
// =============================================================================

/**
 * Sandbox Bash tool - Execute bash commands in isolated container
 */
export interface SandboxBashInput {
  /** Bash command to execute */
  command: string;
  /** Timeout in milliseconds (default 30000, max 300000) */
  timeout?: number;
  /** Working directory (default /workspace) */
  workdir?: string;
}

export interface SandboxBashOutput {
  /** Standard output from command */
  stdout: string;
  /** Standard error from command */
  stderr: string;
  /** Exit code (0 = success) */
  exitCode: number;
  /** Execution time in milliseconds */
  executionTime: number;
}

/**
 * Sandbox Read tool - Read file contents from container
 */
export interface SandboxReadInput {
  /** Path to file (absolute or relative to /workspace) */
  path: string;
}

export interface SandboxReadOutput {
  /** File content as string */
  content: string;
  /** File size in bytes */
  size: number;
  /** Resolved absolute path */
  path: string;
}

/**
 * Sandbox Write tool - Write file to container
 */
export interface SandboxWriteInput {
  /** Path where file should be written */
  path: string;
  /** Content to write */
  content: string;
}

export interface SandboxWriteOutput {
  /** Whether write was successful */
  success: boolean;
  /** Resolved absolute path */
  path: string;
  /** Bytes written */
  size: number;
}

// =============================================================================
// TOOL STATE TYPES
// =============================================================================

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

// =============================================================================
// MODEL TYPES
// =============================================================================

/**
 * Raw model data from OpenRouter API
 * This matches the exact structure returned by GET /api/v1/models
 */
export interface OpenRouterModel {
  /** Unique identifier in format "provider/model-name" */
  id: string;

  /** Human-readable model name */
  name: string;

  /** Unix timestamp when model was added to OpenRouter */
  created?: number;

  /** Description of model capabilities and use cases */
  description?: string;

  /** Maximum context window size in tokens */
  context_length: number;

  /** Model architecture details */
  architecture?: {
    /** Input/output modality (e.g., "text->text", "text+image->text") */
    modality?: string;
    /** Tokenizer type (e.g., "Claude", "GPT", "Llama3") */
    tokenizer?: string;
    /** Instruction format type */
    instruct_type?: string;
  };

  /** Pricing information (costs as decimal strings) */
  pricing: {
    /** Cost per input token (e.g., "0.000003" for $3/M tokens) */
    prompt: string;
    /** Cost per output token */
    completion: string;
    /** Cost per image for vision models */
    image?: string;
    /** Per-request cost if applicable */
    request?: string;
  };

  /** Top provider information */
  top_provider?: {
    /** Context length at top provider */
    context_length?: number;
    /** Maximum completion tokens */
    max_completion_tokens?: number;
    /** Whether content is moderated */
    is_moderated?: boolean;
  };

  /** Per-request rate limits (null if none) */
  per_request_limits?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  } | null;

  /** Supported generation methods */
  supported_generation_methods?: string[];
}

/**
 * Model capabilities derived from raw data
 */
export interface ModelCapabilities {
  /** Whether model supports tool/function calling */
  supportsTools: boolean;
  /** Whether model supports image inputs (vision) */
  supportsVision: boolean;
  /** Whether model has extended reasoning/thinking capabilities */
  supportsReasoning: boolean;
  /** Whether model supports structured JSON output */
  supportsJsonOutput: boolean;
}

/**
 * Parsed and normalized pricing information
 */
export interface ModelPricing {
  /** Cost per 1M input tokens in USD */
  promptPerMillion: number;
  /** Cost per 1M output tokens in USD */
  completionPerMillion: number;
  /** Cost per image (for vision models) in USD */
  imagePerUnit: number | null;
  /** Whether the model is completely free */
  isFree: boolean;
}

/**
 * Transformed model with computed properties for UI display
 * This is the main type used throughout the client-side code
 */
export interface Model {
  /** Unique model ID from OpenRouter (e.g., "anthropic/claude-sonnet-4") */
  id: string;

  /** Human-readable name (e.g., "Claude Sonnet 4") */
  name: string;

  /** Provider extracted from ID (e.g., "anthropic") */
  provider: string;

  /** Optional description */
  description?: string;

  /** Context window size in tokens */
  contextLength: number;

  /** Maximum completion tokens (if known) */
  maxCompletionTokens?: number;

  /** Parsed pricing information */
  pricing: ModelPricing;

  /** Computed capabilities */
  capabilities: ModelCapabilities;

  /** Unix timestamp when added (for sorting) */
  createdAt?: number;

  /** Original modality string (e.g., "text+image->text") */
  modality?: string;
}

/**
 * Filter state for model list
 */
export interface ModelFilters {
  /** Free-text search query */
  search: string;

  /** Selected providers to show (empty = all) */
  providers: string[];

  /** Capability filters (null = don't filter) */
  capabilities: {
    tools: boolean | null;
    vision: boolean | null;
    reasoning: boolean | null;
    free: boolean | null;
  };

  /** Sort order */
  sortBy: ModelSortOption;
}

/**
 * Available sort options for model list
 */
export type ModelSortOption =
  | 'name-asc'
  | 'name-desc'
  | 'price-asc'
  | 'price-desc'
  | 'context-asc'
  | 'context-desc'
  | 'newest'
  | 'provider';

/**
 * API response from /api/models endpoint
 */
export interface ModelsApiResponse {
  /** List of transformed models */
  models: Model[];

  /** Unique provider names for filter dropdown */
  providers: string[];

  /** Total model count before filtering */
  totalCount: number;

  /** ISO timestamp when data was cached */
  cachedAt: string | null;

  /** Whether data is from cache */
  fromCache: boolean;
}

/**
 * Provider display info for UI
 */
export interface ProviderInfo {
  /** Provider ID (e.g., "anthropic") */
  id: string;

  /** Display name (e.g., "Anthropic") */
  displayName: string;

  /** Number of models from this provider */
  modelCount: number;
}

// =============================================================================
// PROVIDER SELECTION TYPES
// =============================================================================

/**
 * A provider/endpoint that can serve a specific model
 * Data comes from OpenRouter's Endpoints API
 */
export interface ModelProvider {
  /** Provider display name (e.g., "Anthropic", "Amazon Bedrock") */
  name: string;

  /** Provider slug for API routing */
  slug: string;

  /** Pricing per million tokens */
  pricing: {
    prompt: number;
    completion: number;
    cacheRead?: number;
    cacheWrite?: number;
  };

  /** Whether this provider supports prompt caching */
  supportsCaching: boolean;

  /** Uptime percentage in last 30 minutes (0-100) */
  uptime: number;

  /** Maximum context length at this provider */
  contextLength: number;

  /** Maximum completion tokens at this provider */
  maxCompletionTokens?: number;
}

/**
 * API response from /api/providers/[model] endpoint
 */
export interface ProvidersApiResponse {
  /** Model ID that was queried */
  modelId: string;

  /** Available providers for this model */
  providers: ModelProvider[];

  /** Number of providers available */
  count: number;
}

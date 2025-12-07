/**
 * Firecrawl client utility
 * Supports both self-hosted and cloud modes
 */

interface FirecrawlConfig {
  mode: 'self-hosted' | 'cloud';
  selfHostedUrl: string;
  apiKey: string;
}

interface FirecrawlSearchOptions {
  limit?: number;
  scrapeContent?: boolean;
}

interface FirecrawlScrapeOptions {
  formats?: string[];
  onlyMainContent?: boolean;
}

interface FirecrawlSearchResultItem {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
  };
}

// Response when using scrapeOptions - data is a flat array
interface FirecrawlSearchResponseWithScrape {
  success: boolean;
  data?: FirecrawlSearchResultItem[];
  error?: string;
}

// Response without scrapeOptions - data is an object with web/images/news arrays
interface FirecrawlSearchResponseWithoutScrape {
  success: boolean;
  data?: {
    web?: FirecrawlSearchResultItem[];
    images?: Array<{
      title?: string;
      imageUrl?: string;
      url?: string;
    }>;
    news?: Array<{
      title?: string;
      url?: string;
      snippet?: string;
      date?: string;
    }>;
  };
  error?: string;
}

// Union type to handle both response structures
type FirecrawlSearchApiResponse = FirecrawlSearchResponseWithScrape | FirecrawlSearchResponseWithoutScrape;

// Normalized response that always has data as an array
interface FirecrawlSearchResponse {
  success: boolean;
  data?: FirecrawlSearchResultItem[];
  error?: string;
}

/**
 * Normalize Firecrawl search response to always return data as an array
 * Handles both response formats:
 * - With scrapeOptions: { data: [...] }
 * - Without scrapeOptions: { data: { web: [...], images: [...], news: [...] } }
 */
function normalizeSearchResponse(response: FirecrawlSearchApiResponse): FirecrawlSearchResponse {
  if (!response.data) {
    return {
      success: response.success,
      data: [],
      error: response.error,
    };
  }

  // Check if data is already an array (response with scrapeOptions)
  if (Array.isArray(response.data)) {
    return {
      success: response.success,
      data: response.data,
      error: response.error,
    };
  }

  // Data is an object with web/images/news arrays (response without scrapeOptions)
  // Extract web results and convert to the standard format
  const dataObj = response.data as FirecrawlSearchResponseWithoutScrape['data'];
  const webResults = dataObj?.web || [];

  // Map web results to the standard result item format
  const normalizedData: FirecrawlSearchResultItem[] = webResults.map((item) => ({
    url: item.url,
    title: item.title,
    description: item.description,
    markdown: item.markdown,
    metadata: item.metadata,
  }));

  return {
    success: response.success,
    data: normalizedData,
    error: response.error,
  };
}

interface FirecrawlScrapeResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    links?: string[];
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
    };
  };
  error?: string;
}

/**
 * Get Firecrawl configuration from runtime config
 * Defaults to cloud mode since user has API key configured
 */
function getFirecrawlConfig(): FirecrawlConfig {
  const config = useRuntimeConfig();

  // Debug: Log all config keys to see what Nuxt loaded
  console.log('[Firecrawl Debug] runtimeConfig keys:', Object.keys(config));
  console.log('[Firecrawl Debug] config.firecrawlApiKey value:', config.firecrawlApiKey ? 'SET: ' + String(config.firecrawlApiKey).substring(0, 10) : 'EMPTY');
  console.log('[Firecrawl Debug] config.openrouterApiKey value:', config.openrouterApiKey ? 'SET: ' + String(config.openrouterApiKey).substring(0, 10) : 'EMPTY');
  console.log('[Firecrawl Debug] process.env NUXT_FIRECRAWL_API_KEY:', process.env.NUXT_FIRECRAWL_API_KEY ? 'SET' : 'NOT SET');

  // Default to cloud mode (user has API key configured)
  // Can be switched to self-hosted via settings in Phase 6
  // Try both runtimeConfig and process.env
  const apiKey = config.firecrawlApiKey || process.env.NUXT_FIRECRAWL_API_KEY || '';
  const selfHostedUrl = config.firecrawlSelfHostedUrl || 'http://localhost:3002';

  // Use cloud mode if API key is present, otherwise fall back to self-hosted
  const mode: 'self-hosted' | 'cloud' = apiKey ? 'cloud' : 'self-hosted';

  // Debug logging
  console.log('[Firecrawl Config]', {
    mode,
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'none',
    selfHostedUrl,
  });

  return {
    mode,
    selfHostedUrl,
    apiKey,
  };
}

/**
 * Get the base URL for Firecrawl API based on mode
 */
function getBaseUrl(config: FirecrawlConfig): string {
  if (config.mode === 'self-hosted') {
    return config.selfHostedUrl;
  }
  return 'https://api.firecrawl.dev';
}

/**
 * Get headers for Firecrawl API requests
 */
function getHeaders(config: FirecrawlConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add authorization header for cloud mode
  if (config.mode === 'cloud' && config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  return headers;
}

/**
 * Search the web using Firecrawl
 * Uses the v2 /search endpoint
 */
export async function firecrawlSearch(
  query: string,
  options: FirecrawlSearchOptions = {}
): Promise<FirecrawlSearchResponse> {
  const config = getFirecrawlConfig();
  const baseUrl = getBaseUrl(config);

  const requestBody: Record<string, unknown> = {
    query,
    limit: options.limit || 5,
  };

  // Add scrapeOptions if we want to scrape content from results
  if (options.scrapeContent) {
    requestBody.scrapeOptions = {
      formats: ['markdown'],
      onlyMainContent: true,
    };
  }

  const response = await fetch(`${baseUrl}/v2/search`, {
    method: 'POST',
    headers: getHeaders(config),
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firecrawl search failed: ${response.status} - ${errorText}`);
  }

  const apiResponse = (await response.json()) as FirecrawlSearchApiResponse;

  // Normalize the response to always have data as an array
  return normalizeSearchResponse(apiResponse);
}

/**
 * Scrape a URL using Firecrawl
 * Uses the v2 /scrape endpoint
 */
export async function firecrawlScrape(
  url: string,
  options: FirecrawlScrapeOptions = {}
): Promise<FirecrawlScrapeResponse> {
  const config = getFirecrawlConfig();
  const baseUrl = getBaseUrl(config);

  const requestBody = {
    url,
    formats: options.formats || ['markdown'],
    onlyMainContent: options.onlyMainContent ?? true,
  };

  const response = await fetch(`${baseUrl}/v2/scrape`, {
    method: 'POST',
    headers: getHeaders(config),
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firecrawl scrape failed: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<FirecrawlScrapeResponse>;
}

// Crawl API Types
interface FirecrawlCrawlOptions {
  limit?: number;
  maxDepth?: number;
}

interface FirecrawlCrawlPage {
  url?: string;
  markdown?: string;
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
  };
}

interface FirecrawlCrawlResponse {
  success: boolean;
  status: string;
  data?: FirecrawlCrawlPage[];
  error?: string;
}

// Map API Types
interface FirecrawlMapOptions {
  limit?: number;
  search?: string;
}

interface FirecrawlMapResponse {
  success: boolean;
  links?: string[];
  error?: string;
}

/**
 * Crawl a website using Firecrawl
 * Uses the v2 /crawl endpoint (async operation with polling)
 */
export async function firecrawlCrawl(
  url: string,
  options: FirecrawlCrawlOptions = {}
): Promise<FirecrawlCrawlResponse> {
  const config = getFirecrawlConfig();
  const baseUrl = getBaseUrl(config);

  // Start crawl job
  const startResponse = await fetch(`${baseUrl}/v2/crawl`, {
    method: 'POST',
    headers: getHeaders(config),
    body: JSON.stringify({
      url,
      limit: options.limit || 10,
      maxDiscoveryDepth: options.maxDepth || 2,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
      },
    }),
  });

  if (!startResponse.ok) {
    const errorText = await startResponse.text();
    throw new Error(`Firecrawl crawl failed to start: ${startResponse.status} - ${errorText}`);
  }

  const startResult = (await startResponse.json()) as { id?: string; success?: boolean };
  const jobId = startResult.id;

  if (!jobId) {
    throw new Error('Firecrawl crawl failed: No job ID returned');
  }

  // Poll for completion (with timeout)
  const maxWaitTime = 60000; // 60 seconds
  const pollInterval = 2000; // 2 seconds
  let elapsed = 0;

  while (elapsed < maxWaitTime) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    elapsed += pollInterval;

    const statusResponse = await fetch(`${baseUrl}/v2/crawl/${jobId}`, {
      headers: getHeaders(config),
    });

    if (!statusResponse.ok) {
      // Retry on non-OK status
      continue;
    }

    const result = (await statusResponse.json()) as FirecrawlCrawlResponse;

    if (result.status === 'completed') {
      return {
        success: true,
        status: 'completed',
        data: result.data || [],
      };
    } else if (result.status === 'failed') {
      throw new Error(`Crawl failed: ${result.error || 'Unknown error'}`);
    }
    // else: still running, continue polling
  }

  throw new Error('Crawl timed out after 60 seconds');
}

/**
 * Map a website using Firecrawl
 * Uses the v2 /map endpoint (synchronous)
 */
export async function firecrawlMap(
  url: string,
  options: FirecrawlMapOptions = {}
): Promise<FirecrawlMapResponse> {
  const config = getFirecrawlConfig();
  const baseUrl = getBaseUrl(config);

  const requestBody: Record<string, unknown> = {
    url,
    limit: options.limit || 100,
  };

  if (options.search) {
    requestBody.search = options.search;
  }

  const response = await fetch(`${baseUrl}/v2/map`, {
    method: 'POST',
    headers: getHeaders(config),
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firecrawl map failed: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<FirecrawlMapResponse>;
}

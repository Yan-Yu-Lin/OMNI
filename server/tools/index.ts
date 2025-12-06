import { webSearchTool } from './web-search';
import { scrapeUrlTool } from './scrape-url';

/**
 * All available tools for the chat endpoint
 * Tool names use snake_case to match convention
 */
export const tools = {
  web_search: webSearchTool,
  scrape_url: scrapeUrlTool,
};

// Export individual tools for typing and testing
export { webSearchTool, scrapeUrlTool };

import { webSearchTool } from './web-search';
import { scrapeUrlTool } from './scrape-url';
import { crawlSiteTool } from './crawl-site';
import { mapSiteTool } from './map-site';

/**
 * All available tools for the chat endpoint
 * Tool names use snake_case to match convention
 */
export const tools = {
  web_search: webSearchTool,
  scrape_url: scrapeUrlTool,
  crawl_site: crawlSiteTool,
  map_site: mapSiteTool,
};

// Export individual tools for typing and testing
export { webSearchTool, scrapeUrlTool, crawlSiteTool, mapSiteTool };

import { webSearchTool } from './web-search';
import { scrapeUrlTool } from './scrape-url';
import { crawlSiteTool } from './crawl-site';
import { mapSiteTool } from './map-site';
import { createSandboxBashTool } from './sandbox-bash';
import { createSandboxReadTool } from './sandbox-read';
import { createSandboxWriteTool } from './sandbox-write';

/**
 * Static tools (don't need conversation context)
 * Tool names use snake_case to match convention
 */
export const staticTools = {
  web_search: webSearchTool,
  scrape_url: scrapeUrlTool,
  crawl_site: crawlSiteTool,
  map_site: mapSiteTool,
};

/**
 * Create sandbox tools bound to a specific conversation
 * These tools need conversationId to know which container to use
 */
export function createSandboxTools(conversationId: string) {
  return {
    sandbox_bash: createSandboxBashTool(conversationId),
    sandbox_read: createSandboxReadTool(conversationId),
    sandbox_write: createSandboxWriteTool(conversationId),
  };
}

/**
 * Create all tools for a conversation
 * Combines static tools with conversation-specific sandbox tools
 */
export function createAllTools(conversationId: string) {
  return {
    ...staticTools,
    ...createSandboxTools(conversationId),
  };
}

// Legacy export for backward compatibility
export const tools = staticTools;

// Export individual tools for typing and testing
export { webSearchTool, scrapeUrlTool, crawlSiteTool, mapSiteTool };
export { createSandboxBashTool, createSandboxReadTool, createSandboxWriteTool };

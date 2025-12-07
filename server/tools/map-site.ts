import { tool } from 'ai';
import { z } from 'zod';
import { firecrawlMap } from '../utils/firecrawl';

/**
 * Website mapping tool using Firecrawl
 * Discovers all URLs on a website without scraping content
 */
const mapSiteSchema = z.object({
  url: z.string().url().describe('The website URL to map'),
  limit: z
    .number()
    .min(1)
    .max(500)
    .default(100)
    .describe('Maximum number of URLs to return (1-500)'),
  search: z
    .string()
    .optional()
    .describe('Filter URLs containing this text (optional)'),
});

export const mapSiteTool = tool({
  description:
    'Discover all URLs on a website without scraping content. Fast way to understand site structure and find specific pages. Use this before crawling to identify which sections to explore.',
  inputSchema: mapSiteSchema,
  execute: async ({ url, limit, search }: z.infer<typeof mapSiteSchema>) => {
    try {
      const response = await firecrawlMap(url, { limit, search });

      const urls = response.links || [];

      return {
        urlsFound: urls.length,
        urls: urls.slice(0, limit),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Map failed';
      throw new Error(message);
    }
  },
});

import { tool } from 'ai';
import { z } from 'zod';
import { firecrawlScrape } from '../utils/firecrawl';

/**
 * URL scraping tool using Firecrawl
 * Extracts content from a specific URL
 */
const scrapeUrlSchema = z.object({
  url: z.string().url().describe('The URL to scrape'),
  onlyMainContent: z
    .boolean()
    .default(true)
    .describe('Whether to exclude navigation, headers, and footers'),
});

export const scrapeUrlTool = tool({
  description:
    'Extract content from a specific URL. Returns the page content as markdown. Use this when you need to read the full content of a specific webpage.',
  inputSchema: scrapeUrlSchema,
  execute: async ({ url, onlyMainContent }: z.infer<typeof scrapeUrlSchema>) => {
    try {
      const response = await firecrawlScrape(url, {
        formats: ['markdown', 'links'],
        onlyMainContent,
      });

      if (!response.success) {
        throw new Error(response.error || 'Scrape failed');
      }

      const data = response.data || {};

      return {
        url: data.metadata?.sourceURL || url,
        title: data.metadata?.title || 'Untitled',
        description: data.metadata?.description || '',
        markdown: data.markdown || '',
        links: data.links || [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scrape failed';
      throw new Error(message);
    }
  },
});

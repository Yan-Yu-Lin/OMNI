import { tool } from 'ai';
import { z } from 'zod';
import { firecrawlCrawl } from '../utils/firecrawl';

/**
 * Website crawling tool using Firecrawl
 * Recursively crawls a website to extract content from multiple pages
 */
const crawlSiteSchema = z.object({
  url: z.string().url().describe('The starting URL to crawl from'),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe('Maximum number of pages to crawl (1-50)'),
  maxDepth: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Maximum link depth to follow (1-5)'),
});

export const crawlSiteTool = tool({
  description:
    'Crawl a website recursively to extract content from multiple pages. Useful for understanding a whole site or documentation section. Takes longer than other tools due to async processing.',
  inputSchema: crawlSiteSchema,
  execute: async ({ url, limit, maxDepth }: z.infer<typeof crawlSiteSchema>) => {
    try {
      const response = await firecrawlCrawl(url, { limit, maxDepth });

      // Format the results
      const pages = (response.data || []).map((item) => ({
        url: item.metadata?.sourceURL || item.url || url,
        title: item.metadata?.title || 'Untitled',
        markdown: item.markdown || '',
      }));

      return {
        pagesFound: pages.length,
        pages,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Crawl failed';
      throw new Error(message);
    }
  },
});

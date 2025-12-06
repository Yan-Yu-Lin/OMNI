import { tool } from 'ai';
import { z } from 'zod';
import { firecrawlSearch } from '../utils/firecrawl';

/**
 * Web search tool using Firecrawl
 * Searches the web and returns results with full page content
 */
const webSearchSchema = z.object({
  query: z.string().describe('The search query to find relevant information'),
  limit: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe('Number of search results to return (1-20)'),
});

export const webSearchTool = tool({
  description:
    'Search the web for information. Returns search results with page content. Use this when the user asks about current events, recent information, or anything you need to look up online.',
  inputSchema: webSearchSchema,
  execute: async ({ query, limit }: z.infer<typeof webSearchSchema>) => {
    try {
      const response = await firecrawlSearch(query, {
        limit,
        scrapeContent: true,
      });

      if (!response.success) {
        throw new Error(response.error || 'Search failed');
      }

      // Format the results
      const results = (response.data || []).map((item) => ({
        url: item.url,
        title: item.title || item.metadata?.title || 'Untitled',
        description: item.description || item.metadata?.description || '',
        markdown: item.markdown || '',
      }));

      return { results };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed';
      throw new Error(message);
    }
  },
});

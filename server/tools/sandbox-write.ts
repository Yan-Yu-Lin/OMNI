import { tool } from 'ai';
import { z } from 'zod';
import { DockerSandbox } from '../utils/docker';

/**
 * Sandbox write tool - Write file contents to the Docker container
 * Uses factory pattern to receive conversationId from chat endpoint
 */
const sandboxWriteSchema = z.object({
  description: z
    .string()
    .describe('A brief, human-readable description of what file you are creating (e.g., "Creating Python script for data analysis", "Writing configuration file")'),
  path: z
    .string()
    .describe('Path where the file should be written. Can be absolute (/workspace/file.txt) or relative to /workspace'),
  content: z.string().describe('The content to write to the file'),
});

/**
 * Create a sandbox_write tool bound to a specific conversation
 */
export function createSandboxWriteTool(conversationId: string) {
  return tool({
    description: `Write or create a file in the sandbox container.
Files in /workspace persist across messages in this conversation.
Parent directories are created automatically if they don't exist.
Use absolute paths starting with / or paths relative to /workspace.`,
    inputSchema: sandboxWriteSchema,
    execute: async ({ path, content }: z.infer<typeof sandboxWriteSchema>) => {
      try {
        console.log(`[sandbox_write] Writing file for conversation ${conversationId}: ${path}`);

        const result = await DockerSandbox.writeFile(conversationId, path, content);

        console.log(`[sandbox_write] File written successfully: ${result.size} bytes`);

        return {
          success: result.success,
          path: result.path,
          size: result.size,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to write file';
        console.error(`[sandbox_write] Error: ${message}`);
        throw new Error(message);
      }
    },
  });
}

// Export the schema for type inference
export type SandboxWriteInput = z.infer<typeof sandboxWriteSchema>;
export type SandboxWriteOutput = {
  success: boolean;
  path: string;
  size: number;
};

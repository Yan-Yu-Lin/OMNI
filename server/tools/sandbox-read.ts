import { tool } from 'ai';
import { z } from 'zod';
import { DockerSandbox } from '../utils/docker';

/**
 * Sandbox read tool - Read file contents from the Docker container
 * Uses factory pattern to receive conversationId from chat endpoint
 */
const sandboxReadSchema = z.object({
  description: z
    .string()
    .describe('A brief, human-readable description of why you are reading this file (e.g., "Checking build output", "Reviewing generated code")'),
  path: z
    .string()
    .describe('Path to the file to read. Can be absolute (/workspace/file.txt) or relative to /workspace'),
});

/**
 * Create a sandbox_read tool bound to a specific conversation
 */
export function createSandboxReadTool(conversationId: string) {
  return tool({
    description: `Read the contents of a file from the sandbox container.
Files in /workspace persist across messages in this conversation.
Use absolute paths starting with / or paths relative to /workspace.`,
    inputSchema: sandboxReadSchema,
    execute: async ({ path }: z.infer<typeof sandboxReadSchema>) => {
      try {
        console.log(`[sandbox_read] Reading file for conversation ${conversationId}: ${path}`);

        const result = await DockerSandbox.readFile(conversationId, path);

        console.log(`[sandbox_read] File read successfully: ${result.size} bytes`);

        return {
          content: result.content,
          size: result.size,
          path: result.path,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to read file';
        console.error(`[sandbox_read] Error: ${message}`);
        throw new Error(message);
      }
    },
  });
}

// Export the schema for type inference
export type SandboxReadInput = z.infer<typeof sandboxReadSchema>;
export type SandboxReadOutput = {
  content: string;
  size: number;
  path: string;
};

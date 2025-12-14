import { tool } from 'ai';
import { z } from 'zod';
import { DockerSandbox } from '../utils/docker';

/**
 * Sandbox bash tool - Execute bash commands in an isolated Docker container
 * Uses factory pattern to receive conversationId from chat endpoint
 */
const sandboxBashSchema = z.object({
  description: z
    .string()
    .describe('A brief, human-readable description of what this command does (e.g., "Installing Python dependencies", "Running tests")'),
  command: z.string().describe('The bash command to execute in the container'),
  timeout: z
    .number()
    .min(1000)
    .max(300000)
    .default(30000)
    .describe('Timeout in milliseconds (1000-300000, default 30000)'),
  workdir: z
    .string()
    .default('/workspace')
    .describe('Working directory for the command (default /workspace)'),
});

/**
 * Create a sandbox_bash tool bound to a specific conversation
 */
export function createSandboxBashTool(conversationId: string) {
  return tool({
    description: `Execute bash commands in an isolated Linux container with Python 3, Node.js, git, curl, and build tools installed.
The container has network access (can pip install, npm install, curl, etc).
Files in /workspace persist across messages in this conversation.
Use this for running code, installing packages, or any shell commands.`,
    inputSchema: sandboxBashSchema,
    execute: async ({ command, timeout, workdir }: z.infer<typeof sandboxBashSchema>) => {
      try {
        console.log(`[sandbox_bash] Executing command for conversation ${conversationId}: ${command.slice(0, 100)}...`);

        const result = await DockerSandbox.exec(conversationId, command, {
          timeout,
          workdir,
        });

        console.log(`[sandbox_bash] Command completed with exit code ${result.exitCode}`);

        return {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          executionTime: result.executionTime,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Command execution failed';
        console.error(`[sandbox_bash] Error: ${message}`);

        // Return error as a proper result so AI can see what went wrong
        return {
          stdout: '',
          stderr: message,
          exitCode: 1,
          executionTime: 0,
        };
      }
    },
  });
}

// Export the schema for type inference
export type SandboxBashInput = z.infer<typeof sandboxBashSchema>;
export type SandboxBashOutput = {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
};

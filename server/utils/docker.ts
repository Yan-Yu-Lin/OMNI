/**
 * Docker Sandbox Utility
 * Manages isolated container environments for AI code execution
 */

import Docker from 'dockerode';
import { mkdir } from 'fs/promises';
import { join } from 'path';

// Types for execution results
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

export interface FileReadResult {
  content: string;
  size: number;
  path: string;
}

export interface FileWriteResult {
  success: boolean;
  path: string;
  size: number;
}

// Configuration defaults
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_TIMEOUT = 300000; // 5 minutes
const MAX_OUTPUT_SIZE = 102400; // 100KB
const SANDBOX_IMAGE = 'ai-sandbox:latest';
const WORKSPACE_PATH = '/workspace';

// Container resource limits
const CONTAINER_MEMORY = 512 * 1024 * 1024; // 512MB
const CONTAINER_CPU_PERIOD = 100000;
const CONTAINER_CPU_QUOTA = 50000; // 50% CPU
const CONTAINER_PIDS_LIMIT = 100;

// In-memory container tracking
const containerMap = new Map<string, Docker.Container>();

// Activity tracking for idle timeout
const lastActivityMap = new Map<string, number>();

/**
 * Update the last activity timestamp for a container
 */
function updateActivity(conversationId: string): void {
  lastActivityMap.set(conversationId, Date.now());
}

// Docker client singleton
let dockerClient: Docker | null = null;

/**
 * Get the Docker client instance
 */
function getDocker(): Docker {
  if (!dockerClient) {
    dockerClient = new Docker();
  }
  return dockerClient;
}

/**
 * Get the host path for a conversation's workspace
 */
function getWorkspacePath(conversationId: string): string {
  // Use absolute path relative to project root
  return join(process.cwd(), 'data', 'sandboxes', conversationId);
}

/**
 * Ensure the workspace directory exists
 */
async function ensureWorkspaceDir(conversationId: string): Promise<string> {
  const workspacePath = getWorkspacePath(conversationId);
  await mkdir(workspacePath, { recursive: true });
  return workspacePath;
}

/**
 * Truncate output if it exceeds the maximum size
 */
function truncateOutput(output: string, maxSize: number = MAX_OUTPUT_SIZE): string {
  if (output.length <= maxSize) {
    return output;
  }
  const truncated = output.slice(0, maxSize);
  return `${truncated}\n\n[Output truncated - exceeded ${maxSize} bytes]`;
}

/**
 * Docker Sandbox Manager
 * Provides container lifecycle management and execution capabilities
 */
export const DockerSandbox = {
  /**
   * Get an existing container or create a new one for the conversation
   */
  async getOrCreate(conversationId: string): Promise<Docker.Container> {
    // Check if we have an existing container in memory
    const existingContainer = containerMap.get(conversationId);
    if (existingContainer) {
      try {
        // Verify container state
        const info = await existingContainer.inspect();
        if (info.State.Running) {
          return existingContainer;
        }
        // Container exists but stopped - RESTART it (preserves installed packages)
        if (info.State.Status === 'exited') {
          console.log(`[DockerSandbox] Restarting stopped container for ${conversationId}`);
          await existingContainer.start();
          updateActivity(conversationId);
          return existingContainer;
        }
        // Container in bad state, remove from map
        containerMap.delete(conversationId);
        lastActivityMap.delete(conversationId);
      } catch {
        // Container no longer exists, remove from map
        containerMap.delete(conversationId);
        lastActivityMap.delete(conversationId);
      }
    }

    // Create new container
    const docker = getDocker();
    const workspacePath = await ensureWorkspaceDir(conversationId);

    console.log(`[DockerSandbox] Creating container for conversation ${conversationId}`);
    console.log(`[DockerSandbox] Workspace path: ${workspacePath}`);

    const container = await docker.createContainer({
      Image: SANDBOX_IMAGE,
      name: `sandbox-${conversationId}-${Date.now()}`,
      WorkingDir: WORKSPACE_PATH,
      Tty: false,
      OpenStdin: false,
      HostConfig: {
        Binds: [`${workspacePath}:${WORKSPACE_PATH}`],
        Memory: CONTAINER_MEMORY,
        CpuPeriod: CONTAINER_CPU_PERIOD,
        CpuQuota: CONTAINER_CPU_QUOTA,
        PidsLimit: CONTAINER_PIDS_LIMIT,
        NetworkMode: 'bridge', // Allow network access
        AutoRemove: false, // Keep container for reuse
      },
    });

    await container.start();
    containerMap.set(conversationId, container);
    updateActivity(conversationId);

    console.log(`[DockerSandbox] Container started: ${container.id}`);

    return container;
  },

  /**
   * Execute a bash command in the container
   */
  async exec(
    conversationId: string,
    command: string,
    options?: {
      timeout?: number;
      workdir?: string;
    }
  ): Promise<ExecResult> {
    const startTime = Date.now();
    const timeout = Math.min(options?.timeout || DEFAULT_TIMEOUT, MAX_TIMEOUT);
    const workdir = options?.workdir || WORKSPACE_PATH;

    // Update activity timestamp
    updateActivity(conversationId);

    try {
      const container = await this.getOrCreate(conversationId);

      // Create exec instance
      const exec = await container.exec({
        Cmd: ['bash', '-c', command],
        AttachStdout: true,
        AttachStderr: true,
        WorkingDir: workdir,
      });

      // Start exec with timeout
      const stream = await exec.start({ Detach: false, Tty: false });

      // Collect output with timeout
      const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>(
        (resolve, reject) => {
          let stdoutData = '';
          let stderrData = '';

          const timeoutId = setTimeout(() => {
            stream.destroy();
            reject(new Error(`Command timed out after ${timeout}ms`));
          }, timeout);

          // Docker demux: stdout and stderr are multiplexed in the stream
          // Each frame has 8-byte header: [type(1), 0, 0, 0, size(4)]
          let buffer = Buffer.alloc(0);

          stream.on('data', (chunk: Buffer) => {
            buffer = Buffer.concat([buffer, chunk]);

            while (buffer.length >= 8) {
              const type = buffer[0];
              const size = buffer.readUInt32BE(4);

              if (buffer.length < 8 + size) {
                break; // Wait for more data
              }

              const payload = buffer.slice(8, 8 + size).toString('utf-8');
              buffer = buffer.slice(8 + size);

              if (type === 1) {
                stdoutData += payload;
              } else if (type === 2) {
                stderrData += payload;
              }
            }
          });

          stream.on('end', () => {
            clearTimeout(timeoutId);
            resolve({
              stdout: truncateOutput(stdoutData),
              stderr: truncateOutput(stderrData),
            });
          });

          stream.on('error', (err: Error) => {
            clearTimeout(timeoutId);
            reject(err);
          });
        }
      );

      // Get exit code
      const inspectResult = await exec.inspect();
      const exitCode = inspectResult.ExitCode ?? 0;

      return {
        stdout,
        stderr,
        exitCode,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        stdout: '',
        stderr: `Error executing command: ${errorMessage}`,
        exitCode: 1,
        executionTime: Date.now() - startTime,
      };
    }
  },

  /**
   * Read a file from the container
   */
  async readFile(conversationId: string, path: string): Promise<FileReadResult> {
    // Update activity timestamp
    updateActivity(conversationId);

    // Normalize path to be within workspace
    const normalizedPath = path.startsWith('/') ? path : `${WORKSPACE_PATH}/${path}`;

    const result = await this.exec(conversationId, `cat "${normalizedPath}" && stat -c %s "${normalizedPath}"`);

    if (result.exitCode !== 0) {
      throw new Error(`Failed to read file: ${result.stderr || 'Unknown error'}`);
    }

    // The output contains the file content followed by the size on the last line
    const lines = result.stdout.split('\n');
    const sizeLine = lines.pop() || '0';
    const content = lines.join('\n');
    const size = parseInt(sizeLine.trim(), 10) || content.length;

    return {
      content,
      size,
      path: normalizedPath,
    };
  },

  /**
   * Write a file to the container
   */
  async writeFile(conversationId: string, path: string, content: string): Promise<FileWriteResult> {
    // Update activity timestamp
    updateActivity(conversationId);

    // Normalize path to be within workspace
    const normalizedPath = path.startsWith('/') ? path : `${WORKSPACE_PATH}/${path}`;

    // Ensure parent directory exists and write file
    // Use heredoc to handle multi-line content safely
    const dirPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
    const escapedContent = content.replace(/'/g, "'\\''");

    const command = `mkdir -p "${dirPath}" && cat > "${normalizedPath}" << 'SANDBOX_EOF'
${content}
SANDBOX_EOF
stat -c %s "${normalizedPath}"`;

    const result = await this.exec(conversationId, command);

    if (result.exitCode !== 0) {
      throw new Error(`Failed to write file: ${result.stderr || 'Unknown error'}`);
    }

    const size = parseInt(result.stdout.trim(), 10) || content.length;

    return {
      success: true,
      path: normalizedPath,
      size,
    };
  },

  /**
   * Check if a container is running for the conversation
   */
  async isRunning(conversationId: string): Promise<boolean> {
    const container = containerMap.get(conversationId);
    if (!container) {
      return false;
    }

    try {
      const info = await container.inspect();
      return info.State.Running;
    } catch {
      containerMap.delete(conversationId);
      lastActivityMap.delete(conversationId);
      return false;
    }
  },

  /**
   * Stop and remove the container for a conversation
   * The workspace volume persists on disk
   */
  async stop(conversationId: string): Promise<void> {
    const container = containerMap.get(conversationId);
    if (!container) {
      lastActivityMap.delete(conversationId);
      return;
    }

    try {
      console.log(`[DockerSandbox] Stopping and removing container for conversation ${conversationId}`);
      await container.stop({ t: 5 });
      await container.remove();
    } catch (error) {
      // Container might already be stopped/removed
      console.log(`[DockerSandbox] Error stopping container: ${error}`);
    } finally {
      containerMap.delete(conversationId);
      lastActivityMap.delete(conversationId);
    }
  },

  /**
   * Stop a container without removing it (preserves installed packages)
   * Container can be restarted later via getOrCreate()
   */
  async stopContainer(conversationId: string): Promise<void> {
    const container = containerMap.get(conversationId);
    if (!container) {
      return;
    }

    try {
      const info = await container.inspect();
      if (info.State.Running) {
        console.log(`[DockerSandbox] Stopping idle container for ${conversationId}`);
        await container.stop({ t: 5 });
      }
    } catch (error) {
      console.log(`[DockerSandbox] Error stopping container: ${error}`);
    }
    // NOTE: Do NOT remove from containerMap - we want to restart it later
  },

  /**
   * Get all tracked conversation IDs
   */
  getTrackedConversations(): string[] {
    return Array.from(containerMap.keys());
  },

  /**
   * Get the last activity timestamp for a container
   */
  getLastActivity(conversationId: string): number | undefined {
    return lastActivityMap.get(conversationId);
  },

  /**
   * Stop idle containers based on timeout (without removing them)
   * Returns array of conversation IDs that were stopped
   */
  async stopIdleContainers(idleTimeout: number = 10 * 60 * 1000): Promise<string[]> {
    const now = Date.now();
    const stoppedIds: string[] = [];

    for (const conversationId of containerMap.keys()) {
      const lastActivity = lastActivityMap.get(conversationId);

      // If no activity recorded, treat as very old
      const idleTime = lastActivity ? now - lastActivity : Infinity;

      if (idleTime > idleTimeout) {
        console.log(
          `[DockerSandbox] Container for ${conversationId} idle for ${Math.round(idleTime / 1000)}s, stopping...`
        );

        try {
          await this.stopContainer(conversationId);
          stoppedIds.push(conversationId);
        } catch (error) {
          console.error(`[DockerSandbox] Failed to stop idle container ${conversationId}:`, error);
        }
      }
    }

    if (stoppedIds.length > 0) {
      console.log(`[DockerSandbox] Stopped ${stoppedIds.length} idle container(s)`);
    }

    return stoppedIds;
  },

  /**
   * Stop and remove all containers (for graceful shutdown)
   */
  async stopAll(): Promise<void> {
    const count = containerMap.size;
    if (count === 0) {
      return;
    }

    console.log(`[DockerSandbox] Stopping all ${count} container(s)...`);

    const stopPromises = Array.from(containerMap.keys()).map(async (conversationId) => {
      try {
        await this.stop(conversationId);
      } catch (error) {
        console.error(`[DockerSandbox] Error stopping container ${conversationId}:`, error);
      }
    });

    await Promise.all(stopPromises);
    console.log('[DockerSandbox] All containers stopped');
  },

  /**
   * Get workspace path for a conversation (for user access)
   */
  getWorkspacePath,
};

/**
 * Docker Sandbox Cleanup Plugin
 * Periodically stops idle containers to prevent resource exhaustion
 * Containers are stopped but NOT removed (preserves installed packages)
 */

import Docker from 'dockerode';
import { DockerSandbox } from '../utils/docker';

// Store interval reference for cleanup on shutdown
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Clean up orphaned containers from previous server runs
 * These containers are not tracked in memory, so we remove them entirely
 */
async function cleanupOrphanedContainers(): Promise<void> {
  try {
    const docker = new Docker();

    // List all containers (including stopped) matching our naming pattern
    const containers = await docker.listContainers({
      all: true,
      filters: { name: ['sandbox-'] },
    });

    if (containers.length === 0) {
      console.log('[DockerSandbox] No orphaned containers found');
      return;
    }

    console.log(`[DockerSandbox] Found ${containers.length} orphaned container(s) from previous runs, cleaning up...`);

    for (const containerInfo of containers) {
      try {
        const container = docker.getContainer(containerInfo.Id);

        // Stop if running
        if (containerInfo.State === 'running') {
          await container.stop({ t: 5 });
        }

        // Remove the container
        await container.remove();
        console.log(`[DockerSandbox] Removed orphaned container: ${containerInfo.Names?.[0] || containerInfo.Id}`);
      } catch (error) {
        console.error(`[DockerSandbox] Error removing orphaned container ${containerInfo.Id}:`, error);
      }
    }
  } catch (error) {
    // Docker might not be available, that's okay
    console.log('[DockerSandbox] Could not check for orphaned containers:', error);
  }
}

export default defineNitroPlugin((nitroApp) => {
  // Get configuration from runtime config
  const config = useRuntimeConfig();
  const idleTimeout = config.dockerSandboxIdleTimeout || 600000; // 10 minutes
  const cleanupInterval = config.dockerSandboxCleanupInterval || 60000; // 1 minute

  console.log('[DockerSandbox] Cleanup plugin initializing...');
  console.log(`[DockerSandbox] Idle timeout: ${idleTimeout / 1000}s, Cleanup interval: ${cleanupInterval / 1000}s`);

  // Clean up orphaned containers from previous server runs
  cleanupOrphanedContainers().catch((error) => {
    console.error('[DockerSandbox] Error during orphan cleanup:', error);
  });

  // Start the periodic cleanup interval
  cleanupIntervalId = setInterval(async () => {
    try {
      const tracked = DockerSandbox.getTrackedConversations();

      // Only log if there are containers to check
      if (tracked.length > 0) {
        console.log(`[DockerSandbox] Checking ${tracked.length} container(s) for idle timeout...`);
      }

      await DockerSandbox.stopIdleContainers(idleTimeout);
    } catch (error) {
      console.error('[DockerSandbox] Cleanup error:', error);
    }
  }, cleanupInterval);

  console.log('[DockerSandbox] Cleanup interval started');

  // Handle graceful shutdown using Nitro's close hook
  nitroApp.hooks.hook('close', async () => {
    console.log('[DockerSandbox] Server shutting down, cleaning up...');

    // Clear the cleanup interval
    if (cleanupIntervalId) {
      clearInterval(cleanupIntervalId);
      cleanupIntervalId = null;
      console.log('[DockerSandbox] Cleanup interval cleared');
    }

    // Stop all containers gracefully (stop + remove on shutdown)
    try {
      await DockerSandbox.stopAll();
    } catch (error) {
      console.error('[DockerSandbox] Error during shutdown cleanup:', error);
    }
  });
});

# Task 02: Docker Utility Class

## Goal

Create a `DockerSandbox` class that manages container lifecycle and provides methods for executing commands and file operations.

## What to Create

### `server/utils/docker.ts`

A utility class with these capabilities:

**Container Lifecycle:**
- `getOrCreate(conversationId)` - Get existing container or create new one
- Lazy initialization (only create when first needed)
- Mount volume `./data/sandboxes/{conversationId}/` to `/workspace`
- Store container references in a Map keyed by conversationId

**Execution:**
- `exec(conversationId, command, options?)` - Execute bash command
- Return `{ stdout, stderr, exitCode, executionTime }`
- Support timeout (default 30s, max 5min)
- Truncate output if too large (100KB limit)

**File Operations:**
- `readFile(conversationId, path)` - Read file from container
- `writeFile(conversationId, path, content)` - Write file to container

**Cleanup:**
- `stop(conversationId)` - Stop container (volume persists)
- `isRunning(conversationId)` - Check if container is active

## Context to Gather

Look at these files to understand patterns:
- `server/utils/firecrawl.ts` - Example of external API utility
- `server/utils/openrouter.ts` - Example of client configuration
- `nuxt.config.ts` - How runtime config is structured

## Dependencies

Install the Docker SDK:
```bash
pnpm add dockerode
pnpm add -D @types/dockerode
```

## Key Implementation Details

**Volume Mounting:**
```
Host: ./data/sandboxes/conv-abc123/
Container: /workspace
```

**Container Settings:**
- Image: `ai-sandbox:latest`
- Network: enabled (AI needs internet for pip/npm)
- Working directory: `/workspace`
- Keep running with `tail -f /dev/null` or similar

**Resource Limits (optional but recommended):**
- Memory: 512MB
- CPU: 50%
- Max processes: 100

## Success Criteria

1. Can create a container for a conversation
2. Can execute commands and get output
3. Can read/write files
4. Resuming same conversationId reuses the same volume (files persist)
5. Different conversationIds get isolated workspaces

## Notes

- Use `dockerode` npm package for Docker SDK
- Container can be stopped when not in use, volume persists
- Handle errors gracefully (Docker not running, image not built, etc.)

# Task 06: Types and Config

## Goal

Add TypeScript type definitions and runtime configuration for the sandbox feature.

## What to Modify

### 1. `app/types/index.ts`

Add type definitions for sandbox tool inputs and outputs.

**Context:** Look at existing types like `WebSearchInput`, `WebSearchOutput`, `ScrapeUrlInput`, etc.

**Types to add:**

```typescript
// Sandbox Bash
interface SandboxBashInput {
  command: string;
  timeout?: number;
  workdir?: string;
}

interface SandboxBashOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

// Sandbox Read
interface SandboxReadInput {
  path: string;
}

interface SandboxReadOutput {
  content: string;
  size: number;
  path: string;
}

// Sandbox Write
interface SandboxWriteInput {
  path: string;
  content: string;
}

interface SandboxWriteOutput {
  success: boolean;
  path: string;
  size: number;
}
```

Export all of these.

### 2. `nuxt.config.ts`

Add runtime configuration for Docker sandbox.

**Context:** Look at existing runtimeConfig structure for patterns.

**Config to add:**
```typescript
runtimeConfig: {
  // ... existing config
  dockerSandboxImage: 'ai-sandbox:latest',
  dockerSandboxTimeout: 30000,        // Default command timeout (30s)
  dockerSandboxMaxOutput: 102400,     // Max output size (100KB)
  dockerSandboxWorkspacePath: './data/sandboxes',  // Where volumes are stored
}
```

### 3. `package.json`

Ensure `dockerode` dependency is added (if not done in Task 02):

```bash
pnpm add dockerode
pnpm add -D @types/dockerode
```

### 4. (Optional) Update `CLAUDE.md`

Add documentation about the sandbox feature:
- What tools are available
- How to build the Docker image
- Where workspace files are stored
- Any environment variables needed

## Context to Gather

- `app/types/index.ts` - Existing type patterns
- `nuxt.config.ts` - Existing runtime config structure
- `CLAUDE.md` - Documentation format

## Success Criteria

1. All sandbox types are defined and exported
2. Runtime config values are accessible via `useRuntimeConfig()`
3. No TypeScript errors across the project
4. `pnpm run build` succeeds

## Notes

- Types should match exactly what the tools return
- Config values should have sensible defaults
- The DockerSandbox utility (Task 02) should read these config values

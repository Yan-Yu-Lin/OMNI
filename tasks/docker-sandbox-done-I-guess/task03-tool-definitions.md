# Task 03: Tool Definitions

## Goal

Create three AI tools for interacting with the Docker sandbox: `sandbox_bash`, `sandbox_read`, `sandbox_write`.

## What to Create

### 1. `server/tools/sandbox-bash.ts`

Execute bash commands in the container.

**Input Schema:**
- `command` (string, required) - The bash command to execute
- `timeout` (number, optional, default 30000) - Timeout in milliseconds
- `workdir` (string, optional, default '/workspace') - Working directory

**Output:**
- `stdout` - Command standard output
- `stderr` - Command standard error
- `exitCode` - Exit code (0 = success)
- `executionTime` - How long it took in ms

### 2. `server/tools/sandbox-read.ts`

Read file contents from the container.

**Input Schema:**
- `path` (string, required) - Absolute path to file in container

**Output:**
- `content` - File contents as string
- `size` - File size in bytes
- `path` - The path that was read

### 3. `server/tools/sandbox-write.ts`

Write or create files in the container.

**Input Schema:**
- `path` (string, required) - Absolute path to file in container
- `content` (string, required) - Content to write

**Output:**
- `success` - Boolean indicating success
- `path` - The path that was written
- `size` - Bytes written

## Context to Gather

**IMPORTANT:** Study these files carefully for the exact patterns:

- `server/tools/web-search.ts` - Tool definition pattern with Zod schema
- `server/tools/scrape-url.ts` - Another tool example
- `server/tools/index.ts` - How tools are exported

**Key patterns to follow:**
- Use `tool()` from 'ai' package
- Use `z` from 'zod' for input schema
- Use `.describe()` on every schema field (LLM sees this)
- Always wrap execute in try/catch
- Throw `Error` instances for failures

## How Tools Get conversationId

The tools need `conversationId` to know which container to use. Look at how the chat endpoint (`server/api/chat.post.ts`) passes context to tools. You may need to:
- Pass conversationId via closure
- Or modify tool to accept it as a parameter
- Or use a context/state pattern

Study how existing tools work and follow the same approach.

## Success Criteria

1. Each tool has proper Zod schema with descriptions
2. Tools use the DockerSandbox utility from Task 02
3. Tools handle errors gracefully (container not running, file not found, etc.)
4. Tools are exported and ready for registration

## Notes

- Tool names should use snake_case when registered (sandbox_bash, not sandboxBash)
- The AI sees the description and parameter descriptions - make them clear
- Consider what happens if Docker is not running - return helpful error

# Docker Sandbox Feature

Give the AI its own isolated Linux environment where it can execute bash commands, read/write files, and maintain state within conversations.

## Requirements

- **Image**: Ubuntu 24.04 with Python 3, Node.js, git, curl, wget, build-essential
- **Tools**: `sandbox_bash`, `sandbox_read`, `sandbox_write`
- **Network**: Allowed (AI can pip install, npm install, curl, etc.)
- **Lazy loading**: Container created on first tool use
- **Persistence**: Workspace files persist via volumes at `./data/sandboxes/{conversationId}/`
- **Resumable**: Resume conversation = same workspace files

## Tasks

Execute in order:

| Task | Description | Dependencies |
|------|-------------|--------------|
| `task01-docker-setup.md` | Dockerfile and build script | None |
| `task02-docker-utility.md` | DockerSandbox class | Task 1 (need image built) |
| `task03-tool-definitions.md` | Three sandbox tools | Task 2 |
| `task04-chat-integration.md` | Register tools, update system prompt | Task 3 |
| `task05-frontend-ui.md` | Result components and Message.vue | Task 4 |
| `task06-types-config.md` | TypeScript types and runtime config | Can run in parallel with Task 5 |

## Architecture

```
User sends message
       │
       ▼
streamText() with tools
       │
       ├─► sandbox_bash ──► DockerSandbox.exec()
       ├─► sandbox_read ──► DockerSandbox.readFile()
       └─► sandbox_write ──► DockerSandbox.writeFile()
                                    │
                                    ▼
                           Docker Container
                           (ubuntu + python + node)
                                    │
                                    ▼
                           /workspace (mounted volume)
                           ./data/sandboxes/{convId}/
```

## Testing

After all tasks complete:

1. Build the Docker image: `./docker/build.sh`
2. Start dev server: `pnpm dev`
3. Create new conversation
4. Ask AI to: "Create a Python script that prints hello world and run it"
5. Verify output shows in UI
6. Close and reopen conversation, ask AI to list files - should see the script

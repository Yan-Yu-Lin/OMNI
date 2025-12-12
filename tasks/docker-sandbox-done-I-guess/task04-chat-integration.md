# Task 04: Chat Integration

## Goal

Register the sandbox tools and update the system prompt so the AI knows how to use them.

## What to Modify

### 1. `server/tools/index.ts`

Add the three new sandbox tools to the tools registry.

**Context:** Look at how existing tools (web_search, scrape_url, etc.) are imported and exported.

**What to do:**
- Import the three sandbox tools
- Add them to the `tools` object with snake_case keys:
  - `sandbox_bash`
  - `sandbox_read`
  - `sandbox_write`
- Add to the export statement

### 2. `server/api/chat.post.ts`

**Part A: Update SYSTEM_PROMPT**

Add descriptions for the sandbox tools. Look at how existing tools are described (around line 37-52).

Add something like:
```
- sandbox_bash: Execute bash commands in an isolated Linux container.
  The container has Python 3, Node.js, git, curl, wget, and build tools.
  Use for running code, installing packages, compiling, or any shell command.
  Files persist in /workspace across the conversation.

- sandbox_read: Read file contents from the sandbox container.
  Use to check file contents, verify output, or read generated files.

- sandbox_write: Write or create files in the sandbox container.
  Use to create scripts, config files, or any text file.
  Always use absolute paths starting with /workspace/
```

Also add guidance on when to use these tools vs web tools.

**Part B: Pass conversationId to tools**

The sandbox tools need `conversationId` to manage containers. Study how the endpoint works and ensure tools can access this value.

Options:
- Wrap tools with conversationId in closure before passing to streamText
- Add conversationId to request context
- Other patterns used in the codebase

## Context to Gather

Read these files thoroughly:
- `server/tools/index.ts` - Current tool registration
- `server/api/chat.post.ts` - The chat endpoint, especially:
  - SYSTEM_PROMPT (lines ~37-52)
  - How tools are passed to streamText (line ~115+)
  - The onStepFinish and onFinish callbacks

## Success Criteria

1. Sandbox tools appear in the tools object
2. System prompt tells AI about the sandbox tools
3. AI can successfully call sandbox tools (they receive conversationId)
4. No TypeScript errors

## Notes

- Keep system prompt clear and concise
- The AI should understand sandbox tools are for code execution, web tools are for research
- Consider adding examples in the prompt if helpful

# Task 05: Frontend UI

## Goal

Create Vue components to display sandbox tool results in the chat interface.

## What to Create

### 1. `app/components/tools/SandboxBashResult.vue`

Display bash command execution results.

**Should show:**
- The command that was run (from input)
- stdout in a code block (monospace, scrollable if long)
- stderr in a warning/red style (if any)
- Exit code badge: green for 0, red for non-zero
- Execution time

**Design considerations:**
- Large outputs should be scrollable or collapsible
- Syntax highlighting for code output is nice but not required
- Match the existing tool card styling

### 2. `app/components/tools/SandboxFileResult.vue`

Display file read/write results.

**For read operations:**
- Show file path
- Show file content with line numbers (like a code viewer)
- Show file size

**For write operations:**
- Show success message
- Show file path that was written
- Show bytes written

**Design considerations:**
- Can be a single component that handles both read and write
- Or two separate components if cleaner
- Match existing tool result styling

### 3. Modify `app/components/chat/Message.vue`

Add rendering cases for the sandbox tools.

**Context:** Look at how existing tools are rendered (around lines 29-136). Each tool type gets a `<ToolsToolCard>` block.

**What to add:**
- Case for `tool-sandbox_bash` using SandboxBashResult
- Case for `tool-sandbox_read` using SandboxFileResult
- Case for `tool-sandbox_write` using SandboxFileResult

## Context to Gather

**IMPORTANT:** Study these files for patterns:

- `app/components/tools/ToolCard.vue` - The wrapper component, understand its props and slots
- `app/components/tools/SearchResults.vue` - Example of a tool result component
- `app/components/tools/ScrapeResult.vue` - Another example
- `app/components/chat/Message.vue` - How tool parts are detected and rendered

**Key patterns:**
- ToolCard provides `#input` and `#output` slots
- Tool type is `tool-{toolName}` (e.g., `tool-sandbox_bash`)
- State can be: `input-streaming`, `input-available`, `output-available`, `output-error`
- Access input via `part.input`, output via `part.output`

## Success Criteria

1. Sandbox bash results display nicely with stdout/stderr/exitCode
2. File operations show path and content appropriately
3. Error states display with proper styling
4. Components match the visual style of existing tool results
5. No TypeScript errors

## Notes

- Use `<style scoped>` for component styles
- Keep it simple - functionality over fancy UI
- The ToolCard handles expand/collapse and loading states automatically
- Test with various outputs: short, long, with errors, with stderr

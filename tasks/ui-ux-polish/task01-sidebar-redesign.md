# Task 1: Sidebar Conversation List Redesign

## Objective
Make the sidebar conversation list more compact and organized with time-based grouping and pin functionality.

## Context Files to Read First
- `app/components/sidebar/ConversationItem.vue` - Current item rendering
- `app/components/sidebar/ConversationList.vue` - Current list structure
- `app/composables/useConversations.ts` - Conversation state management
- `server/db/index.ts` - Database schema and migrations
- `server/api/conversations/[id].put.ts` - Update endpoint

## Requirements

### 1. Compact Conversation Items
- Remove the date display (Mon, Tue, etc.) from each item
- Reduce vertical padding/height for more compact appearance
- Keep: conversation title (truncated), delete button on hover

### 2. Time-Based Grouping
Add section headers to group conversations:
- **Pinned** (at the very top, separate section)
- **Today**
- **Yesterday**
- **Last 7 Days**
- **Last 30 Days**
- **Older**

Each section should have a subtle header label and visual separator.

### 3. Pin Feature
- Add pin button alongside delete on hover
- Pinned conversations appear in dedicated "Pinned" section at top
- Pin state persists to database

### Implementation Steps

1. **Database Migration** (`server/db/index.ts`)
   - Add `pinned` boolean column to conversations table (default false)

2. **API Update** (`server/api/conversations/[id].put.ts`)
   - Ensure `pinned` field can be updated

3. **Composable Update** (`app/composables/useConversations.ts`)
   - Add `togglePin(id)` function
   - Update types if needed

4. **ConversationItem.vue**
   - Remove date display
   - Reduce padding/height
   - Add pin button (icon) on hover next to delete
   - Pin button calls `togglePin()`

5. **ConversationList.vue**
   - Group conversations by time period
   - Create helper function to categorize by date
   - Render section headers between groups
   - Pinned section always at top (if any pinned)

## Acceptance Criteria
- [ ] Each conversation item is more compact (no date shown)
- [ ] Conversations grouped under time period headers
- [ ] Pinned section appears at top when conversations are pinned
- [ ] Pin/unpin works and persists across page refresh

# Task 3: Home Page Input Field

## Objective
Replace the centered "New Conversation" button on the home page with a text input field ready for immediate chatting.

## Context Files to Read First
- `app/pages/index.vue` - Current home page with button
- `app/components/chat/Input.vue` - Existing chat input component
- `app/composables/useConversations.ts` - For pending message state
- `app/pages/chat/[id].vue` - To understand how to handle pending message
- `app/composables/useSettings.ts` - For model selection state

## Dependency
**Requires Task 2 (Lazy Conversation Creation) to be completed first.**

## Current State
- Home page shows centered "New Conversation" button
- Clicking creates conversation, then navigates

## Desired State
- Text input field at bottom of page (similar to chat page)
- Model selector integrated near/with the input
- User can type and press Enter to start chatting immediately

## Implementation Steps

### 1. Create Pending Message State
In `app/composables/useConversations.ts` or a new composable:
- Add `useState('pendingMessage')` for cross-page message passing
- Add `useState('pendingModel')` if model should also transfer

### 2. Redesign Home Page (`app/pages/index.vue`)
- Remove the centered button layout
- Add input field at bottom (can reuse `ChatInput` component or create variant)
- Add model selector near input
- On submit:
  1. Store message in `pendingMessage` state
  2. Generate ID with `nanoid()`
  3. Navigate to `/chat/{id}`

### 3. Handle Pending Message (`app/pages/chat/[id].vue`)
- On mount, check for `pendingMessage`
- If found:
  1. Clear the pending state
  2. Immediately call `sendMessage()` with the pending content
- User sees chat page with their message already sending

## UX Notes
- SPA transition is instant (no page reload)
- Message appears immediately via optimistic UI
- User experiences: type → Enter → see chat with message + AI responding (~50-100ms)

## Acceptance Criteria
- [ ] Home page shows input field at bottom instead of button
- [ ] Model selector visible near input
- [ ] Typing and pressing Enter navigates to chat and sends message immediately
- [ ] No visible "blink" or loading state during transition
- [ ] Empty home page state looks good (welcoming, not bare)

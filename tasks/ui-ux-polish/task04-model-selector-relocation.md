# Task 4: Model Selector Relocation

## Objective
Move the model selector from the chat header to near/on the input field for better UX flow.

## Context Files to Read First
- `app/pages/chat/[id].vue` - Current model selector placement in header
- `app/components/models/ModelSelector.vue` - The selector component
- `app/components/chat/Input.vue` - Chat input component
- `app/components/chat/Container.vue` - Chat container layout

## Dependency
**Should be done after Task 3 (Home Page Input) for consistency.**

## Current State
- Model selector is in the chat header (top of chat area)
- Separate from the input field

## Desired State
- Model selector integrated with or near the input field
- Consistent placement on both home page and chat page

## Implementation Steps

### 1. Remove from Chat Header (`app/pages/chat/[id].vue`)
- Remove `ModelsModelSelector` from the header section
- Keep provider toggle button if needed, or also relocate

### 2. Integrate with Input Area
Options:
- **Option A:** Add selector inside `ChatInput.vue` component
- **Option B:** Create wrapper component that combines input + selector
- **Option C:** Add selector just above or beside the input in the parent

Recommended: Option A or B for reusability on home page.

### 3. Design Considerations
- Selector should be compact when integrated with input
- Could show just model name/icon, expand on click
- Consider placement: left of input, above input, or as a small dropdown trigger

### 4. Update Home Page
- Ensure same selector placement/style as chat page
- Consistency between pages

## Acceptance Criteria
- [ ] Model selector no longer in chat header
- [ ] Model selector visible near input field on chat page
- [ ] Model selector visible near input field on home page
- [ ] Selector is usable and doesn't crowd the input
- [ ] Provider selection still accessible (if applicable)

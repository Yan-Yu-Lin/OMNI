# Task Patch: Unified Input Container

## Problem
The current model selector implementation is disjointed:
- Model selector and provider button float ABOVE the input as separate elements
- Two separate controls: Model dropdown + "Auto" provider button
- Doesn't feel integrated with the input area

## Goal
Create a unified input container where:
1. Everything is inside ONE box (textarea + toolbar)
2. Model selector is INSIDE the input container (bottom-left of toolbar row)
3. Model AND provider selection happen in the SAME panel (not two separate controls)
4. Remove the separate "Auto" provider button

## Reference Design
```
┌─────────────────────────────────────────────────────────┐
│ Type your message here...                               │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ [Model Name ▼]                              [Send ▶]    │
└─────────────────────────────────────────────────────────┘
```

- Single rounded container with border
- Textarea takes up most of the space (top)
- Toolbar row at bottom: model selector (left), send button (right)
- Model selector is compact inline text with chevron

## Implementation Steps

### 1. Merge Provider Selection into Model Selector

**File: `app/components/models/ModelSelector.vue`**
- After selecting a model, show provider options within the same dropdown/panel
- Could be a two-step flow: Models → Providers for selected model
- Or show providers as sub-options under each model
- Remove need for separate ProviderPanel modal

### 2. Redesign Input Container

**File: `app/components/chat/Container.vue`**
- Create unified container with border/rounded corners
- Structure:
  ```
  <div class="unified-input-container">
    <textarea ... />
    <div class="input-toolbar">
      <ModelSelector ... />  <!-- compact, inline style -->
      <button class="send-btn">...</button>
    </div>
  </div>
  ```

### 3. Update Chat Page

**File: `app/pages/chat/[id].vue`**
- Remove ProviderPanel component usage (merged into ModelSelector)
- Remove `showProviderPanel` state
- Simplify props passed to ChatContainer

### 4. Update Home Page

**File: `app/pages/index.vue`**
- Apply same unified input container design
- Ensure consistency between home and chat pages

## Context Files to Read
- `app/components/chat/Container.vue` - Current input container
- `app/components/chat/Input.vue` - Current input component
- `app/components/models/ModelSelector.vue` - Current model selector
- `app/components/models/ProviderPanel.vue` - Provider selection (to be merged)
- `app/pages/chat/[id].vue` - Chat page using these components
- `app/pages/index.vue` - Home page

## Acceptance Criteria
- [ ] Single unified input container with border
- [ ] Model selector inside the container (bottom-left)
- [ ] Provider selection integrated into model selector dropdown
- [ ] No separate "Auto" provider button
- [ ] Send button inside container (bottom-right)
- [ ] Consistent design on home and chat pages
- [ ] Model selector is compact/inline (not a prominent pill)

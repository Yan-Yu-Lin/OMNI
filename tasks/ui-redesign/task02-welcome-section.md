# Task 02: Unify Home Page + New Chat Experience

## Objective
Create a shared `WelcomeSection` component so both the home page (`/`) and new chat pages (`/chat/[id]`) show the same welcome content with title, subtitle, and suggestion chips.

## Files to Modify
1. `app/components/chat/WelcomeSection.vue` (NEW - create this)
2. `app/components/chat/MessageList.vue` (update empty state)
3. `app/pages/index.vue` (use shared component)

## Implementation

### Step 1: Create WelcomeSection.vue

Create `app/components/chat/WelcomeSection.vue`:

```vue
<template>
  <div class="welcome-section">
    <h1 class="welcome-title">AI Chat</h1>
    <p class="welcome-subtitle">Start a conversation with AI</p>

    <div class="suggestions">
      <button
        v-for="suggestion in suggestions"
        :key="suggestion"
        class="suggestion-chip"
        @click="$emit('suggestion-click', suggestion)"
      >
        {{ suggestion }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  'suggestion-click': [suggestion: string];
}>();

const suggestions = [
  'Explain quantum computing',
  'Write a Python script',
  'Help me brainstorm ideas',
  'Summarize a topic',
];
</script>

<style scoped>
.welcome-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  padding-bottom: 160px; /* Space for input */
}

.welcome-title {
  font-size: 36px;
  font-weight: 600;
  color: var(--color-text-primary, #171717);
  margin: 0 0 8px;
}

.welcome-subtitle {
  font-size: 16px;
  color: var(--color-text-secondary, #666);
  margin: 0 0 32px;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: 500px;
}

.suggestion-chip {
  padding: 8px 16px;
  background: var(--color-bg-secondary, #f5f5f5);
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 20px;
  font-size: 14px;
  color: var(--color-text-primary, #333);
  cursor: pointer;
  transition: all 0.15s ease;
}

.suggestion-chip:hover {
  background: #eee;
  border-color: #ccc;
}
</style>
```

### Step 2: Update MessageList.vue

Replace the empty state in `MessageList.vue` (lines 3-23) with:

```vue
<template v-if="messages.length === 0">
  <ChatWelcomeSection @suggestion-click="$emit('suggestion-click', $event)" />
</template>
```

Add emit definition:
```ts
defineEmits<{
  'suggestion-click': [suggestion: string];
}>();
```

### Step 3: Update Container.vue

Handle the suggestion-click event from MessageList:

Add to template:
```vue
<ChatMessageList
  :messages="messages"
  :is-streaming="isStreaming"
  @suggestion-click="handleSuggestionClick"
/>
```

Add handler:
```ts
const handleSuggestionClick = (suggestion: string) => {
  inputText.value = suggestion;
  textareaRef.value?.focus();
};
```

### Step 4: Update index.vue

Replace the inline welcome markup with the shared component:

```vue
<ChatWelcomeSection @suggestion-click="handleSuggestionClick" />
```

Remove the duplicate `.welcome-section`, `.welcome-title`, `.welcome-subtitle`, `.suggestions`, `.suggestion-chip` styles (now in WelcomeSection.vue).

## Expected Outcome
- Home page shows WelcomeSection component
- New chat page (empty) shows same WelcomeSection
- Clicking suggestion fills the input field
- Consistent experience across both entry points

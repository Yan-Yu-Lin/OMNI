# Phase 8: Polish

> Final improvements, error handling, and UI refinements.

---

## Prerequisites

- All previous phases completed
- Core functionality working

---

## Skills to Load

None required for this phase.

---

## Tasks

### Task 8.1: Add Error Handling

**Create `components/common/ErrorMessage.vue`:**

```vue
<template>
  <div class="error-message" :class="variant">
    <div class="error-icon">
      <span v-if="variant === 'error'">!</span>
      <span v-else-if="variant === 'warning'">⚠</span>
      <span v-else>ℹ</span>
    </div>
    <div class="error-content">
      <div v-if="title" class="error-title">{{ title }}</div>
      <div class="error-text">{{ message }}</div>
    </div>
    <button v-if="dismissible" class="dismiss-btn" @click="$emit('dismiss')">
      ×
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message: string;
  title?: string;
  variant?: 'error' | 'warning' | 'info';
  dismissible?: boolean;
}>();

defineEmits<{
  dismiss: [];
}>();
</script>

<style scoped>
.error-message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  margin: 8px 0;
}

.error-message.error {
  background: #ffebee;
  border: 1px solid #ffcdd2;
  color: #c62828;
}

.error-message.warning {
  background: #fff3e0;
  border: 1px solid #ffe0b2;
  color: #e65100;
}

.error-message.info {
  background: #e3f2fd;
  border: 1px solid #bbdefb;
  color: #1565c0;
}

.error-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.error-content {
  flex: 1;
}

.error-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.error-text {
  font-size: 14px;
}

.dismiss-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  opacity: 0.6;
  padding: 0;
  line-height: 1;
}

.dismiss-btn:hover {
  opacity: 1;
}
</style>
```

**Update `components/chat/Container.vue` to show errors:**

```vue
<template>
  <div class="chat-container">
    <ErrorMessage
      v-if="error"
      :message="error"
      variant="error"
      dismissible
      @dismiss="$emit('dismiss-error')"
    />

    <MessageList
      :messages="messages"
      :is-streaming="isStreaming"
    />

    <Input
      :disabled="isStreaming"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import type { UIMessage } from 'ai';

const props = defineProps<{
  messages: UIMessage[];
  isStreaming?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  send: [text: string];
  'dismiss-error': [];
}>();

const handleSubmit = (text: string) => {
  emit('send', text);
};
</script>
```

---

### Task 8.2: Add Loading Skeletons

**Create `components/common/Skeleton.vue`:**

```vue
<template>
  <div class="skeleton" :style="{ width, height }"></div>
</template>

<script setup lang="ts">
defineProps<{
  width?: string;
  height?: string;
}>();
</script>

<style scoped>
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
```

**Create `components/sidebar/ConversationListSkeleton.vue`:**

```vue
<template>
  <div class="skeleton-list">
    <div v-for="i in 5" :key="i" class="skeleton-item">
      <Skeleton width="70%" height="16px" />
      <Skeleton width="40%" height="12px" style="margin-top: 8px" />
    </div>
  </div>
</template>

<style scoped>
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}

.skeleton-item {
  padding: 12px;
}
</style>
```

---

### Task 8.3: Add Markdown Rendering

**Install markdown library:**

```bash
pnpm add marked
```

**Create `components/common/MarkdownRenderer.vue`:**

```vue
<template>
  <div class="markdown-content" v-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { marked } from 'marked';

const props = defineProps<{
  content: string;
}>();

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

const renderedContent = computed(() => {
  try {
    return marked(props.content);
  } catch {
    return props.content;
  }
});
</script>

<style scoped>
.markdown-content {
  line-height: 1.6;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.markdown-content :deep(h1) { font-size: 1.5em; }
.markdown-content :deep(h2) { font-size: 1.3em; }
.markdown-content :deep(h3) { font-size: 1.1em; }

.markdown-content :deep(p) {
  margin: 0.5em 0;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.markdown-content :deep(li) {
  margin: 0.25em 0;
}

.markdown-content :deep(code) {
  background: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  font-size: 0.9em;
}

.markdown-content :deep(pre) {
  background: #f5f5f5;
  padding: 1em;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.5em 0;
}

.markdown-content :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-content :deep(blockquote) {
  border-left: 3px solid #ddd;
  padding-left: 1em;
  margin-left: 0;
  color: #666;
}

.markdown-content :deep(a) {
  color: #0066cc;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5em 0;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.markdown-content :deep(th) {
  background: #f5f5f5;
  font-weight: 600;
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid #ddd;
  margin: 1em 0;
}

.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
}
</style>
```

**Update `components/chat/Message.vue` to use markdown:**

```vue
<!-- Replace the text-part div with: -->
<div v-if="part.type === 'text'" class="text-part">
  <MarkdownRenderer :content="part.text" />
</div>
```

---

### Task 8.4: Add Keyboard Shortcuts

**Create `composables/useKeyboardShortcuts.ts`:**

```typescript
interface ShortcutHandler {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  handler: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutHandler[]) {
  const handleKeydown = (e: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const ctrlOrMeta = shortcut.ctrl || shortcut.meta;
      const hasCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (
        e.key.toLowerCase() === shortcut.key.toLowerCase() &&
        (!ctrlOrMeta || hasCtrlOrMeta) &&
        (!shortcut.shift || e.shiftKey)
      ) {
        e.preventDefault();
        shortcut.handler();
        return;
      }
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
}
```

**Update `pages/chat/[id].vue` with shortcuts:**

```vue
<script setup lang="ts">
// ... existing code ...

// Add keyboard shortcuts
useKeyboardShortcuts([
  {
    key: 'n',
    ctrl: true,
    handler: handleNewChat,
  },
  {
    key: 'k',
    ctrl: true,
    handler: () => {
      // Focus search/command palette (future feature)
      console.log('Cmd+K pressed');
    },
  },
]);
</script>
```

---

### Task 8.5: Add Responsive Design

**Update `components/layout/AppLayout.vue`:**

```vue
<template>
  <div class="app-layout" :class="{ 'sidebar-open': sidebarOpen }">
    <button
      class="sidebar-toggle"
      @click="sidebarOpen = !sidebarOpen"
    >
      ☰
    </button>

    <aside class="sidebar" @click="handleSidebarClick">
      <slot name="sidebar" />
    </aside>

    <div class="sidebar-overlay" @click="sidebarOpen = false"></div>

    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const sidebarOpen = ref(false);

// Close sidebar on mobile when clicking a link
const handleSidebarClick = (e: Event) => {
  if (window.innerWidth < 768 && (e.target as HTMLElement).closest('a')) {
    sidebarOpen.value = false;
  }
};
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
}

.sidebar-toggle {
  display: none;
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 100;
  width: 40px;
  height: 40px;
  border: none;
  background: #fff;
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.sidebar {
  width: 260px;
  min-width: 260px;
  background: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  z-index: 50;
}

.sidebar-overlay {
  display: none;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Mobile styles */
@media (max-width: 768px) {
  .sidebar-toggle {
    display: block;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
  }

  .sidebar-open .sidebar {
    transform: translateX(0);
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease, visibility 0.2s ease;
    z-index: 40;
  }

  .sidebar-open .sidebar-overlay {
    opacity: 1;
    visibility: visible;
  }

  .main-content {
    padding-top: 56px; /* Space for toggle button */
  }
}
</style>
```

---

### Task 8.6: Add Empty States

**Create `components/common/EmptyState.vue`:**

```vue
<template>
  <div class="empty-state">
    <div v-if="icon" class="empty-icon">{{ icon }}</div>
    <h3 v-if="title" class="empty-title">{{ title }}</h3>
    <p v-if="description" class="empty-description">{{ description }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon?: string;
  title?: string;
  description?: string;
}>();
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px;
  color: #333;
}

.empty-description {
  font-size: 14px;
  color: #666;
  margin: 0;
  max-width: 300px;
}
</style>
```

---

### Task 8.7: Final Cleanup

**Update `assets/css/main.css`:**

```css
/* Reset and base styles */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  line-height: 1.5;
  color: #333;
  background: #fff;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font-family: inherit;
  font-size: inherit;
}

/* Focus styles for accessibility */
:focus-visible {
  outline: 2px solid #000;
  outline-offset: 2px;
}

/* Scrollbar styles */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f0f0f0;
}

::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #999;
}

/* Utility classes */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

### Task 8.8: Add Page Titles

**Update `pages/index.vue`:**

```vue
<script setup lang="ts">
useHead({
  title: 'AI Chat',
});
// ... rest of script
</script>
```

**Update `pages/chat/[id].vue`:**

```vue
<script setup lang="ts">
useHead({
  title: computed(() => {
    const conv = conversations.value.find(c => c.id === conversationId.value);
    return conv?.title || 'Chat';
  }),
});
// ... rest of script
</script>
```

**Update `pages/settings.vue`:**

```vue
<script setup lang="ts">
useHead({
  title: 'Settings - AI Chat',
});
// ... rest of script
</script>
```

**Update `pages/models.vue`:**

```vue
<script setup lang="ts">
useHead({
  title: 'Models - AI Chat',
});
// ... rest of script
</script>
```

---

## Acceptance Criteria

- [ ] Errors display gracefully with dismiss option
- [ ] Loading states show skeletons
- [ ] Markdown renders correctly (code, lists, links, etc.)
- [ ] Mobile layout works with collapsible sidebar
- [ ] Page titles update correctly
- [ ] Empty states are informative
- [ ] Scrollbars are styled
- [ ] Focus states are visible for accessibility

---

## Testing

1. **Test error handling:**
   - Disconnect network
   - Try to send message
   - Should show error message

2. **Test mobile:**
   - Resize browser to mobile width
   - Sidebar should collapse
   - Toggle button should work

3. **Test markdown:**
   - Ask AI to show code examples
   - Should render with syntax highlighting
   - Lists, links, headers should render correctly

4. **Test accessibility:**
   - Tab through the interface
   - Focus should be visible
   - All interactive elements should be reachable

---

## Files Created/Modified

```
components/common/
├── ErrorMessage.vue          # NEW
├── Skeleton.vue              # NEW
├── MarkdownRenderer.vue      # NEW
└── EmptyState.vue            # NEW

components/
├── chat/
│   ├── Container.vue         # MODIFIED
│   └── Message.vue           # MODIFIED
├── layout/
│   └── AppLayout.vue         # MODIFIED
└── sidebar/
    └── ConversationListSkeleton.vue  # NEW

composables/
└── useKeyboardShortcuts.ts   # NEW

assets/css/
└── main.css                  # MODIFIED

pages/
├── index.vue                 # MODIFIED
├── chat/[id].vue             # MODIFIED
├── settings.vue              # MODIFIED
└── models.vue                # MODIFIED

package.json                  # MODIFIED (add marked)
```

---

## Completion

Once Phase 8 is complete, v1.0 of the AI Chat Interface is ready!

**Final checklist:**
- [ ] All features working
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Error handling in place
- [ ] Settings persist
- [ ] Conversations persist
- [ ] All 4 Firecrawl tools work
- [ ] Model selection works
- [ ] Markdown rendering works

**Next steps (post v1.0):**
- Docker execution environment
- Local command execution
- Advanced settings
- Themes
- Export/import conversations

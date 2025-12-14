<template>
  <div class="sidebar-container" :class="{ collapsed }">
    <div class="sidebar-header">
      <button
        class="toggle-btn"
        @click="$emit('toggle-sidebar')"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="toggle-icon"
          :class="{ rotated: collapsed }"
        >
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>
      <button class="new-chat-btn" @click="$emit('new-chat')">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span>New Chat</span>
      </button>
    </div>

    <div class="sidebar-content">
      <slot />
    </div>

    <div class="sidebar-footer">
      <NuxtLink to="/settings" class="footer-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        <span>Settings</span>
      </NuxtLink>
      <NuxtLink to="/models" class="footer-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="7" height="7" x="3" y="3" rx="1"/>
          <rect width="7" height="7" x="14" y="3" rx="1"/>
          <rect width="7" height="7" x="14" y="14" rx="1"/>
          <rect width="7" height="7" x="3" y="14" rx="1"/>
        </svg>
        <span>Models</span>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  collapsed?: boolean;
}>();

defineEmits<{
  'new-chat': [];
  'toggle-sidebar': [];
}>();
</script>

<style scoped>
.sidebar-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  opacity: 1;
  transition: opacity 0.15s ease;
}

.sidebar-container.collapsed {
  opacity: 0;
  pointer-events: none;
}

.sidebar-header {
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 56px; /* Fixed height prevents jitter during collapse */
  flex-shrink: 0;
}

.toggle-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sidebar-text-muted);
  transition:
    background 0.15s ease,
    color 0.15s ease;
  flex-shrink: 0;
}

.toggle-btn:hover {
  background: var(--sidebar-hover);
  color: var(--sidebar-text);
}

.toggle-icon {
  transition: transform 0.2s ease;
}

.toggle-icon.rotated {
  transform: rotate(180deg);
}

.new-chat-btn {
  flex: 1;
  padding: 10px 14px;
  background: var(--sidebar-text);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  font-family: var(--font-sidebar);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap; /* Prevent text wrapping during collapse */
  overflow: hidden;
  transition:
    background 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.new-chat-btn:hover {
  background: #2a2a2a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.new-chat-btn:active {
  transform: scale(0.98);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
}

/* Custom scrollbar for sidebar */
.sidebar-content::-webkit-scrollbar {
  width: 6px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--sidebar-divider);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.footer-link {
  color: var(--sidebar-text-muted);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  line-height: 1; /* Explicit line-height for consistent alignment */
  padding: 8px 10px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: 10px;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.footer-link:hover {
  background: var(--sidebar-hover);
  color: var(--sidebar-text);
}

.footer-link svg {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  opacity: 0.7;
}

.footer-link span {
  line-height: 16px; /* Match icon height for perfect alignment */
}

.footer-link:hover svg {
  opacity: 1;
}
</style>

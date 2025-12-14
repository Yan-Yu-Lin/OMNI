<template>
  <div class="app-layout">
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <LayoutSidebar
        :collapsed="sidebarCollapsed"
        @new-chat="handleNewChat"
      >
        <SidebarConversationList
          :conversations="conversations"
          :active-id="activeConversationId"
          :loading="loading"
          @select="handleSelectConversation"
          @delete="handleDeleteConversation"
          @pin="handlePinConversation"
        />
      </LayoutSidebar>
    </aside>
    <main class="main-content">
      <!-- Floating toggle button - always visible outside sidebar -->
      <button
        class="sidebar-toggle-floating"
        @click="toggleSidebar"
        :title="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
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
          :class="{ rotated: sidebarCollapsed }"
        >
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { nanoid } from 'nanoid';

const route = useRoute();
const router = useRouter();

const {
  conversations,
  loading,
  fetchConversations,
  deleteConversation,
  togglePin,
} = useConversations();

const { fetchSettings } = useSettings();

const activeConversationId = computed(() =>
  route.params.id as string | undefined
);

// Sidebar collapse state with localStorage persistence
const sidebarCollapsed = ref(false);

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed.value));
};

// Lazy conversation creation: generate ID client-side and navigate directly
// Conversation will be created in DB when first message is sent
const handleNewChat = () => {
  const newId = nanoid();
  router.push(`/chat/${newId}`);
};

const handleSelectConversation = (id: string) => {
  router.push(`/chat/${id}`);
};

const handleDeleteConversation = async (id: string) => {
  await deleteConversation(id);
  if (id === activeConversationId.value) {
    const first = conversations.value[0];
    router.push(first ? `/chat/${first.id}` : '/');
  }
};

const handlePinConversation = async (id: string) => {
  await togglePin(id);
};

onMounted(() => {
  // Restore sidebar state from localStorage
  const savedState = localStorage.getItem('sidebarCollapsed');
  if (savedState === 'true') {
    sidebarCollapsed.value = true;
  }

  fetchSettings();
  fetchConversations();
});
</script>

<!-- Non-scoped critical styles for SSR - prevents FOUC -->
<style>
/* Critical sidebar styles - hardcoded values for immediate SSR render */
.sidebar {
  width: 260px;
  min-width: 260px;
  background: linear-gradient(180deg, #faf8f5 0%, #f5f1ed 100%);
  box-shadow: 1px 0 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  overflow: hidden;
}
.sidebar.collapsed { width: 0; min-width: 0; }
.sidebar-container { display: flex; flex-direction: column; height: 100%; }
.sidebar-header { display: flex; align-items: center; gap: 8px; height: 56px; padding: 12px; }
.sidebar-footer { display: flex; flex-direction: column; gap: 4px; padding: 12px; }
.new-chat-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; background: #3d3d3d; color: #fff; border: none; border-radius: 8px; padding: 10px 14px; }
.sidebar-toggle-floating { position: absolute; top: 12px; left: 12px; z-index: 100; width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.9); display: flex; align-items: center; justify-content: center; }
.footer-link { display: flex; align-items: center; gap: 10px; padding: 8px 10px; }
.conversation-list { display: flex; flex-direction: column; gap: 2px; }
</style>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background: var(--sidebar-bg);
  box-shadow: var(--sidebar-shadow);
  display: flex;
  flex-direction: column;
  font-family: var(--font-sidebar);
  transition:
    width var(--sidebar-transition),
    min-width var(--sidebar-transition);
  overflow: hidden;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
  min-width: var(--sidebar-collapsed-width);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* Floating toggle button when sidebar is collapsed */
.sidebar-toggle-floating {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 100;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sidebar-text);
  transition:
    background 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.sidebar-toggle-floating:hover {
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: scale(1.05);
}

.sidebar-toggle-floating:active {
  transform: scale(0.98);
}

.sidebar-toggle-floating .toggle-icon {
  transition: transform 0.2s ease;
}

.sidebar-toggle-floating .toggle-icon.rotated {
  transform: rotate(180deg);
}
</style>

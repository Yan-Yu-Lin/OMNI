<template>
  <div class="app-layout">
    <aside class="sidebar">
      <LayoutSidebar @new-chat="handleNewChat">
        <SidebarConversationList
          :conversations="conversations"
          :active-id="activeConversationId"
          :loading="loading"
          @select="handleSelectConversation"
          @delete="handleDeleteConversation"
        />
      </LayoutSidebar>
    </aside>
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const router = useRouter();

const {
  conversations,
  loading,
  fetchConversations,
  createConversation,
  deleteConversation,
} = useConversations();

const { settings, fetchSettings } = useSettings();

const activeConversationId = computed(() =>
  route.params.id as string | undefined
);

const handleNewChat = async () => {
  const conv = await createConversation({ model: settings.value.model });
  router.push(`/chat/${conv.id}`);
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

onMounted(() => {
  fetchSettings();
  fetchConversations();
});
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.sidebar {
  width: 260px;
  min-width: 260px;
  background: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>

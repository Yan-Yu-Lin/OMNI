import type { Conversation, ConversationWithMessages } from '~/types';
import type { UIMessage } from 'ai';

export function useConversations() {
  const conversations = ref<Conversation[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Fetch all conversations
  const fetchConversations = async () => {
    loading.value = true;
    error.value = null;

    try {
      conversations.value = await $fetch<Conversation[]>('/api/conversations');
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch conversations';
      console.error('Failed to fetch conversations:', e);
    } finally {
      loading.value = false;
    }
  };

  // Get single conversation with messages
  const getConversation = async (id: string): Promise<ConversationWithMessages | null> => {
    try {
      return await $fetch<ConversationWithMessages>(`/api/conversations/${id}`);
    } catch (e) {
      console.error('Failed to fetch conversation:', e);
      return null;
    }
  };

  // Create new conversation
  const createConversation = async (data: { title?: string; model?: string } = {}) => {
    try {
      const conversation = await $fetch('/api/conversations', {
        method: 'POST',
        body: data,
      }) as Conversation;
      conversations.value.unshift(conversation);
      return conversation;
    } catch (e) {
      console.error('Failed to create conversation:', e);
      throw e;
    }
  };

  // Update conversation
  const updateConversation = async (id: string, data: { title?: string; model?: string }) => {
    try {
      await $fetch(`/api/conversations/${id}`, {
        method: 'PUT',
        body: data,
      });

      // Update local state
      const index = conversations.value.findIndex(c => c.id === id);
      const existing = conversations.value[index];
      if (index !== -1 && existing) {
        conversations.value[index] = {
          id: existing.id,
          title: data.title ?? existing.title,
          model: data.model !== undefined ? data.model : existing.model,
          status: existing.status,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
        };
      }
    } catch (e) {
      console.error('Failed to update conversation:', e);
      throw e;
    }
  };

  // Delete conversation
  const deleteConversation = async (id: string) => {
    try {
      await $fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      });

      // Remove from local state
      conversations.value = conversations.value.filter(c => c.id !== id);
    } catch (e) {
      console.error('Failed to delete conversation:', e);
      throw e;
    }
  };

  // Save messages
  const saveMessages = async (conversationId: string, messages: UIMessage[]) => {
    try {
      await $fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: { messages },
      });

      // Update local state after successful save
      const index = conversations.value.findIndex(c => c.id === conversationId);
      const existing = conversations.value[index];
      if (index !== -1 && existing) {
        const now = new Date().toISOString();
        existing.updatedAt = now;

        // Move to top of list (most recently updated)
        if (index > 0) {
          conversations.value.splice(index, 1);
          conversations.value.unshift(existing);
        }
      }
    } catch (e) {
      console.error('Failed to save messages:', e);
    }
  };

  return {
    conversations,
    loading,
    error,
    fetchConversations,
    getConversation,
    createConversation,
    updateConversation,
    deleteConversation,
    saveMessages,
  };
}

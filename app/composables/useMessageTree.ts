import type { BranchMessage, SiblingInfo } from '~/types';

/**
 * Composable for managing conversation message tree with branching support.
 * Handles tree building, path navigation, and branch switching.
 */
export function useMessageTree() {
  // Internal state
  const messageMap = ref<Map<string, BranchMessage>>(new Map());
  const childrenMap = ref<Map<string | null, string[]>>(new Map());
  const activeLeafId = ref<string | null>(null);

  /**
   * Build tree structure from flat message array.
   * Should be called when conversation is loaded or updated.
   *
   * @param messages - All messages with parentId references
   * @param leafId - The active leaf message ID for determining current branch
   */
  function buildTree(messages: BranchMessage[], leafId: string | null) {
    messageMap.value.clear();
    childrenMap.value.clear();
    activeLeafId.value = leafId;

    for (const msg of messages) {
      messageMap.value.set(msg.id, msg);

      const parentKey = msg.parentId;
      if (!childrenMap.value.has(parentKey)) {
        childrenMap.value.set(parentKey, []);
      }
      childrenMap.value.get(parentKey)!.push(msg.id);
    }
  }

  /**
   * Get the active path from root to the current leaf.
   * This is the linear sequence of messages to display.
   *
   * @returns Array of messages from root to leaf in order
   */
  function getActivePath(): BranchMessage[] {
    if (!activeLeafId.value) return [];

    const path: BranchMessage[] = [];
    let currentId: string | null = activeLeafId.value;

    // Walk from leaf to root
    while (currentId) {
      const msg = messageMap.value.get(currentId);
      if (!msg) break;
      path.unshift(msg);
      currentId = msg.parentId;
    }

    return path;
  }

  /**
   * Get sibling navigation info for a message.
   * Used to render branch navigation UI (e.g., "< 1/2 >").
   *
   * @param messageId - The message to get sibling info for
   * @returns SiblingInfo if message has siblings, null otherwise
   */
  function getSiblingInfo(messageId: string): SiblingInfo | null {
    const msg = messageMap.value.get(messageId);
    if (!msg) return null;

    const siblings = childrenMap.value.get(msg.parentId) || [];
    if (siblings.length <= 1) return null; // No navigation needed

    const currentIndex = siblings.indexOf(messageId);
    return {
      total: siblings.length,
      currentIndex: currentIndex + 1, // 1-indexed for display
      siblingIds: siblings,
    };
  }

  /**
   * Switch to a different branch by selecting a sibling message.
   * Calls the server API to update active_leaf_id.
   *
   * @param conversationId - The conversation ID
   * @param messageId - The message ID to switch to
   * @returns Response from the switch-branch API
   */
  async function switchToBranch(conversationId: string, messageId: string) {
    const response = await $fetch(`/api/conversations/${conversationId}/switch-branch`, {
      method: 'POST',
      body: { messageId },
    });

    if (response.activeLeafId) {
      activeLeafId.value = response.activeLeafId;
    }

    return response;
  }

  /**
   * Get the parent ID for creating a sibling message (edit/regenerate).
   * For editing a user message, you want the parent of that message.
   * For regenerating an assistant message, you want the user message before it.
   *
   * @param messageId - The message being edited/regenerated
   * @returns Parent message ID, or null if root
   */
  function getParentForBranch(messageId: string): string | null {
    const msg = messageMap.value.get(messageId);
    return msg?.parentId ?? null;
  }

  return {
    buildTree,
    getActivePath,
    getSiblingInfo,
    switchToBranch,
    getParentForBranch,
    activeLeafId: readonly(activeLeafId),
  };
}

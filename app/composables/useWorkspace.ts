import type {
  WorkspaceFile,
  WorkspaceListResponse,
  WorkspaceFileContent,
  WorkspaceView,
  PreviewMode,
} from '~/types';

export function useWorkspace() {
  // Panel state
  const panelOpen = useState<boolean>('workspace-panel-open', () => false);
  const currentView = useState<WorkspaceView>('workspace-view', () => 'list');
  const previewMode = useState<PreviewMode>('workspace-preview-mode', () => 'rendered');

  // Data state
  const files = useState<WorkspaceFile[]>('workspace-files', () => []);
  const selectedFile = useState<WorkspaceFile | null>('workspace-selected-file', () => null);
  const fileContent = useState<WorkspaceFileContent | null>('workspace-file-content', () => null);

  // Loading states
  const loadingFiles = useState<boolean>('workspace-loading-files', () => false);
  const loadingContent = useState<boolean>('workspace-loading-content', () => false);

  // Error state
  const error = useState<string | null>('workspace-error', () => null);

  // Current conversation ID being viewed
  const currentConversationId = useState<string | null>('workspace-conversation-id', () => null);

  // Computed: whether workspace has any files
  const hasFiles = computed(() => files.value.length > 0);

  // Computed: total file count (recursive)
  const totalFileCount = computed(() => {
    const countFiles = (items: WorkspaceFile[]): number => {
      return items.reduce((count, item) => {
        if (item.type === 'file') {
          return count + 1;
        }
        return count + (item.children ? countFiles(item.children) : 0);
      }, 0);
    };
    return countFiles(files.value);
  });

  // Fetch workspace files for a conversation
  const fetchFiles = async (conversationId: string, force = false) => {
    // Skip if already loaded for this conversation (unless forced)
    if (!force && currentConversationId.value === conversationId && files.value.length > 0) {
      return;
    }

    loadingFiles.value = true;
    error.value = null;

    try {
      const response = await $fetch<WorkspaceListResponse>(
        `/api/conversations/${conversationId}/workspace`
      );
      files.value = response.files;
      currentConversationId.value = conversationId;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load workspace files';
      console.error('Failed to fetch workspace files:', e);
      files.value = [];
    } finally {
      loadingFiles.value = false;
    }
  };

  // Fetch file content for preview
  const fetchFileContent = async (conversationId: string, filePath: string) => {
    loadingContent.value = true;
    error.value = null;

    try {
      const response = await $fetch<WorkspaceFileContent>(
        `/api/conversations/${conversationId}/workspace/${filePath}`
      );
      fileContent.value = response;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load file content';
      console.error('Failed to fetch file content:', e);
      fileContent.value = null;
    } finally {
      loadingContent.value = false;
    }
  };

  // Open the panel
  const openPanel = () => {
    panelOpen.value = true;
  };

  // Close the panel
  const closePanel = () => {
    panelOpen.value = false;
  };

  // Toggle panel
  const togglePanel = () => {
    panelOpen.value = !panelOpen.value;
  };

  // Select a file and switch to detail view
  const selectFile = async (file: WorkspaceFile, conversationId: string) => {
    if (file.type === 'directory') {
      return; // Don't select directories
    }

    selectedFile.value = file;
    currentView.value = 'detail';
    previewMode.value = 'rendered'; // Reset to rendered view

    // Fetch content
    await fetchFileContent(conversationId, file.path);
  };

  // Go back to list view
  const goBack = () => {
    currentView.value = 'list';
    selectedFile.value = null;
    fileContent.value = null;
  };

  // Toggle preview mode (rendered vs code)
  const togglePreviewMode = () => {
    previewMode.value = previewMode.value === 'rendered' ? 'code' : 'rendered';
  };

  // Set preview mode explicitly
  const setPreviewMode = (mode: PreviewMode) => {
    previewMode.value = mode;
  };

  // Get download URL for a file
  const getDownloadUrl = (conversationId: string, filePath: string) => {
    return `/api/conversations/${conversationId}/workspace/${filePath}?download=true`;
  };

  // Copy file content to clipboard
  const copyContent = async () => {
    if (!fileContent.value?.content) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(fileContent.value.content);
      return true;
    } catch (e) {
      console.error('Failed to copy to clipboard:', e);
      return false;
    }
  };

  // Reset workspace state (e.g., when switching conversations)
  const reset = () => {
    files.value = [];
    selectedFile.value = null;
    fileContent.value = null;
    currentView.value = 'list';
    previewMode.value = 'rendered';
    error.value = null;
    currentConversationId.value = null;
  };

  // Refresh files for current conversation
  const refresh = async () => {
    if (currentConversationId.value) {
      await fetchFiles(currentConversationId.value, true);

      // If viewing a file, refresh its content too
      if (selectedFile.value && currentView.value === 'detail') {
        await fetchFileContent(currentConversationId.value, selectedFile.value.path);
      }
    }
  };

  return {
    // State
    panelOpen,
    currentView,
    previewMode,
    files,
    selectedFile,
    fileContent,
    loadingFiles,
    loadingContent,
    error,
    currentConversationId,

    // Computed
    hasFiles,
    totalFileCount,

    // Methods
    fetchFiles,
    fetchFileContent,
    openPanel,
    closePanel,
    togglePanel,
    selectFile,
    goBack,
    togglePreviewMode,
    setPreviewMode,
    getDownloadUrl,
    copyContent,
    reset,
    refresh,
  };
}

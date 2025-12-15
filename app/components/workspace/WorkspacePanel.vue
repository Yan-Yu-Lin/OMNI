<script setup lang="ts">
const props = defineProps<{
  conversationId: string;
}>();

const {
  panelOpen,
  currentView,
  previewMode,
  files,
  selectedFile,
  fileContent,
  loadingFiles,
  loadingContent,
  hasFiles,
  totalFileCount,
  currentConversationId,
  fetchFiles,
  closePanel,
  selectFile,
  goBack,
  setPreviewMode,
  getDownloadUrl,
  copyContent,
  refresh,
} = useWorkspace();

// Resizable panel
const panelRef = ref<HTMLElement | null>(null);
const panelWidth = ref(400);
const isResizing = ref(false);
const minWidth = 300;
const maxWidth = 800;

// Fetch files when panel opens or conversation changes
// Note: With keep-alive, multiple WorkspacePanel instances may exist.
// Only fetch if this panel's conversation matches the current one.
watch(
  () => [panelOpen.value, props.conversationId],
  async ([open, convId]) => {
    // Skip if this panel is for a different (cached) conversation
    if (currentConversationId.value && currentConversationId.value !== convId) {
      return;
    }
    if (open && convId) {
      await fetchFiles(convId as string);
    }
  },
  { immediate: true }
);

// Copy state
const copySuccess = ref(false);

const handleCopy = async () => {
  const success = await copyContent();
  if (success) {
    copySuccess.value = true;
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  }
};

// Handle file selection
const handleSelectFile = (file: any) => {
  selectFile(file, props.conversationId);
};

// Handle download
const handleDownload = () => {
  if (selectedFile.value) {
    const url = getDownloadUrl(props.conversationId, selectedFile.value.path);
    window.open(url, '_blank');
  }
};

// Handle resize
const startResize = (e: MouseEvent) => {
  isResizing.value = true;
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
  e.preventDefault();
};

const handleResize = (e: MouseEvent) => {
  if (!isResizing.value || !panelRef.value) return;

  const rect = panelRef.value.getBoundingClientRect();
  const newWidth = rect.right - e.clientX;
  panelWidth.value = Math.min(maxWidth, Math.max(minWidth, newWidth));
};

const stopResize = () => {
  isResizing.value = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
};

// Check if file is previewable (can toggle between rendered and code)
const isPreviewable = computed(() => {
  if (!fileContent.value) return false;
  const mime = fileContent.value.mimeType;
  return mime === 'text/markdown' || mime === 'text/html';
});

// Check if file is an image
const isImage = computed(() => {
  return fileContent.value?.mimeType?.startsWith('image/') && fileContent.value?.dataUrl;
});

// Get file extension for language detection
const getFileExtension = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext || '';
};
</script>

<template>
  <aside
    v-if="panelOpen"
    ref="panelRef"
    class="workspace-panel"
    :style="{ width: `${panelWidth}px` }"
  >
    <!-- Resize handle -->
    <div class="resize-handle" @mousedown="startResize" />

    <!-- List View Header -->
    <header v-if="currentView === 'list'" class="panel-header">
      <h2 class="panel-title">AI Workspace</h2>
      <button class="icon-btn" title="Close" @click="closePanel">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </header>

    <!-- Detail View Header -->
    <header v-else class="panel-header detail-header">
      <div class="header-left">
        <button class="icon-btn" title="Back to files" @click="goBack">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <!-- View toggle (only for previewable files) -->
        <div v-if="isPreviewable" class="view-toggle">
          <button
            class="toggle-btn"
            :class="{ active: previewMode === 'rendered' }"
            title="Rendered view"
            @click="setPreviewMode('rendered')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button
            class="toggle-btn"
            :class="{ active: previewMode === 'code' }"
            title="Code view"
            @click="setPreviewMode('code')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </button>
        </div>

        <span class="file-name">{{ selectedFile?.name }}</span>
      </div>

      <div class="header-actions">
        <button class="action-btn" :class="{ success: copySuccess }" title="Copy content" @click="handleCopy">
          <svg v-if="!copySuccess" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{{ copySuccess ? 'Copied' : 'Copy' }}</span>
        </button>

        <button class="action-btn" title="Download file" @click="handleDownload">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

        <button class="icon-btn" title="Refresh" @click="refresh">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>

        <button class="icon-btn" title="Close" @click="closePanel">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Content -->
    <div class="panel-content">
      <!-- Loading state -->
      <div v-if="loadingFiles || loadingContent" class="loading-state">
        <div class="spinner" />
        <span>Loading...</span>
      </div>

      <!-- List View -->
      <template v-else-if="currentView === 'list'">
        <div v-if="files.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <p>No files in workspace</p>
          <span class="hint">Files created by the AI will appear here</span>
        </div>
        <WorkspaceFileList
          v-else
          :files="files"
          :conversation-id="conversationId"
          @select="handleSelectFile"
        />
      </template>

      <!-- Detail View -->
      <template v-else>
        <WorkspaceFilePreview
          v-if="fileContent"
          :file-content="fileContent"
          :preview-mode="previewMode"
        />
        <div v-else class="empty-state">
          <p>Unable to load file content</p>
        </div>
      </template>
    </div>

    <!-- Footer with file count (list view only) -->
    <footer v-if="currentView === 'list' && hasFiles" class="panel-footer">
      <span class="file-count">{{ totalFileCount }} file{{ totalFileCount !== 1 ? 's' : '' }}</span>
    </footer>
  </aside>
</template>

<style scoped>
.workspace-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-left: 1px solid #e0e0e0;
  position: relative;
  overflow: hidden;
}

.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.15s ease;
  z-index: 10;
}

.resize-handle:hover {
  background: #d4a574;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.panel-header.detail-header {
  padding: 12px 16px;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: #171717;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.view-toggle {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: #f5f5f5;
  border-radius: 6px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  transition: all 0.15s ease;
}

.toggle-btn:hover {
  color: #171717;
}

.toggle-btn.active {
  background: #fff;
  color: #171717;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #666;
  transition: all 0.15s ease;
}

.icon-btn:hover {
  background: #f5f5f5;
  color: #171717;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #171717;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.action-btn.success {
  background: #e8f5e9;
  border-color: #4caf50;
  color: #2e7d32;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
  color: #666;
  text-align: center;
}

.loading-state {
  gap: 12px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e0e0e0;
  border-top-color: #d4a574;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state svg {
  color: #ccc;
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 14px;
  font-weight: 500;
  margin: 0 0 4px;
}

.empty-state .hint {
  font-size: 12px;
  color: #999;
}

.panel-footer {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.file-count {
  font-size: 12px;
  color: #666;
}
</style>

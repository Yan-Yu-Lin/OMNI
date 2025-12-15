<script setup lang="ts">
import type { WorkspaceFile } from '~/types';

const props = defineProps<{
  files: WorkspaceFile[];
  conversationId: string;
  depth?: number;
}>();

const emit = defineEmits<{
  select: [file: WorkspaceFile];
}>();

const depth = props.depth ?? 0;

// Track expanded folders
const expandedFolders = ref<Set<string>>(new Set());

const toggleFolder = (path: string) => {
  if (expandedFolders.value.has(path)) {
    expandedFolders.value.delete(path);
  } else {
    expandedFolders.value.add(path);
  }
  // Trigger reactivity
  expandedFolders.value = new Set(expandedFolders.value);
};

const isExpanded = (path: string) => expandedFolders.value.has(path);

// Format file size
const formatSize = (bytes: number): string => {
  if (bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Get icon based on file type/extension
const getFileIcon = (file: WorkspaceFile) => {
  if (file.type === 'directory') {
    return isExpanded(file.path) ? 'folder-open' : 'folder';
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // Map extensions to icon types
  const iconMap: Record<string, string> = {
    // Code
    js: 'code',
    ts: 'code',
    jsx: 'code',
    tsx: 'code',
    vue: 'code',
    py: 'code',
    rb: 'code',
    go: 'code',
    rs: 'code',
    java: 'code',
    c: 'code',
    cpp: 'code',
    h: 'code',
    php: 'code',
    swift: 'code',
    kt: 'code',

    // Web
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'css',
    sass: 'css',

    // Data
    json: 'json',
    xml: 'json',
    yaml: 'json',
    yml: 'json',
    csv: 'table',
    tsv: 'table',

    // Text
    md: 'markdown',
    markdown: 'markdown',
    txt: 'text',
    log: 'text',

    // Images
    png: 'image',
    jpg: 'image',
    jpeg: 'image',
    gif: 'image',
    svg: 'image',
    webp: 'image',

    // Shell
    sh: 'terminal',
    bash: 'terminal',
    zsh: 'terminal',

    // Config
    env: 'config',
    gitignore: 'config',
    toml: 'config',
    ini: 'config',
  };

  return iconMap[ext] || 'file';
};

// Handle file/folder click
const handleClick = (file: WorkspaceFile) => {
  if (file.type === 'directory') {
    toggleFolder(file.path);
  } else {
    emit('select', file);
  }
};

// Download URL
const { getDownloadUrl } = useWorkspace();

const handleDownload = (e: Event, file: WorkspaceFile) => {
  e.stopPropagation();
  const url = getDownloadUrl(props.conversationId, file.path);
  window.open(url, '_blank');
};
</script>

<template>
  <div class="file-list" :style="{ paddingLeft: depth > 0 ? '16px' : '0' }">
    <div
      v-for="file in files"
      :key="file.path"
      class="file-item-wrapper"
    >
      <div
        class="file-item"
        :class="{ folder: file.type === 'directory' }"
        @click="handleClick(file)"
      >
        <!-- Icon -->
        <div class="file-icon" :class="getFileIcon(file)">
          <!-- Folder icons -->
          <svg v-if="file.type === 'directory' && !isExpanded(file.path)" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
          </svg>
          <svg v-else-if="file.type === 'directory'" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z" />
          </svg>

          <!-- Code file -->
          <svg v-else-if="getFileIcon(file) === 'code'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>

          <!-- Markdown -->
          <svg v-else-if="getFileIcon(file) === 'markdown'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>

          <!-- JSON/Data -->
          <svg v-else-if="getFileIcon(file) === 'json'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M8 13h2" />
            <path d="M8 17h2" />
            <path d="M14 13h2" />
            <path d="M14 17h2" />
          </svg>

          <!-- Image -->
          <svg v-else-if="getFileIcon(file) === 'image'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>

          <!-- Terminal/Shell -->
          <svg v-else-if="getFileIcon(file) === 'terminal'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>

          <!-- HTML -->
          <svg v-else-if="getFileIcon(file) === 'html'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>

          <!-- CSS -->
          <svg v-else-if="getFileIcon(file) === 'css'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M12 18v-6" />
            <path d="M8 18v-1" />
            <path d="M16 18v-3" />
          </svg>

          <!-- Default file -->
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>

        <!-- Name -->
        <span class="file-name">{{ file.name }}</span>

        <!-- Size (for files only) -->
        <span v-if="file.type === 'file'" class="file-size">{{ formatSize(file.size) }}</span>

        <!-- Download button (for files only) -->
        <button
          v-if="file.type === 'file'"
          class="download-btn"
          title="Download"
          @click="handleDownload($event, file)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

        <!-- Chevron for folders -->
        <svg
          v-if="file.type === 'directory'"
          class="chevron"
          :class="{ expanded: isExpanded(file.path) }"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      <!-- Nested files (expanded folders) -->
      <WorkspaceFileList
        v-if="file.type === 'directory' && file.children && isExpanded(file.path)"
        :files="file.children"
        :conversation-id="conversationId"
        :depth="depth + 1"
        @select="(f) => emit('select', f)"
      />
    </div>
  </div>
</template>

<style scoped>
.file-list {
  padding: 4px 0;
}

.file-item-wrapper {
  /* Container for item + nested children */
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.15s ease;
  border-bottom: 1px solid #f5f5f5;
}

.file-item:hover {
  background: #f9f9f9;
}

.file-item.folder {
  font-weight: 500;
}

.file-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.file-icon.folder,
.file-icon.folder-open {
  color: #d4a574;
}

.file-icon.code {
  color: #3b82f6;
}

.file-icon.markdown {
  color: #6366f1;
}

.file-icon.json {
  color: #f59e0b;
}

.file-icon.image {
  color: #10b981;
}

.file-icon.terminal {
  color: #171717;
}

.file-icon.html {
  color: #ef4444;
}

.file-icon.css {
  color: #06b6d4;
}

.file-name {
  flex: 1;
  font-size: 13px;
  color: #171717;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 11px;
  color: #999;
  flex-shrink: 0;
}

.download-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #999;
  opacity: 0;
  transition: all 0.15s ease;
}

.file-item:hover .download-btn {
  opacity: 1;
}

.download-btn:hover {
  background: #e0e0e0;
  color: #171717;
}

.chevron {
  flex-shrink: 0;
  color: #999;
  transition: transform 0.2s ease;
}

.chevron.expanded {
  transform: rotate(90deg);
}
</style>

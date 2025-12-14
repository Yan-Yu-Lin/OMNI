<script setup lang="ts">
import { marked, type MarkedOptions } from 'marked';
import DOMPurify from 'dompurify';
import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki';
import type { WorkspaceFileContent, PreviewMode } from '~/types';

const props = defineProps<{
  fileContent: WorkspaceFileContent;
  previewMode: PreviewMode;
}>();

// Shiki highlighter instance (lazy loaded)
const highlighter = ref<Highlighter | null>(null);

// Initialize Shiki highlighter
const initHighlighter = async () => {
  if (highlighter.value) return;

  try {
    highlighter.value = await createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: [
        'javascript',
        'typescript',
        'python',
        'bash',
        'shell',
        'json',
        'html',
        'css',
        'markdown',
        'yaml',
        'sql',
        'go',
        'rust',
        'java',
        'c',
        'cpp',
        'jsx',
        'tsx',
        'vue',
        'swift',
        'kotlin',
        'ruby',
        'php',
        'plaintext',
        'xml',
        'toml',
        'ini',
        'csv',
      ],
    });
  } catch (error) {
    console.warn('Failed to initialize Shiki highlighter:', error);
  }
};

// Initialize on mount
onMounted(() => {
  initHighlighter();
});

// Map MIME types to Shiki languages
const mimeToLang: Record<string, string> = {
  'text/javascript': 'javascript',
  'text/typescript': 'typescript',
  'text/x-python': 'python',
  'text/x-ruby': 'ruby',
  'text/x-go': 'go',
  'text/x-rust': 'rust',
  'text/x-java': 'java',
  'text/x-kotlin': 'kotlin',
  'text/x-swift': 'swift',
  'text/x-c': 'c',
  'text/x-c++': 'cpp',
  'text/x-csharp': 'csharp',
  'text/x-php': 'php',
  'text/x-sql': 'sql',
  'text/x-shellscript': 'bash',
  'text/html': 'html',
  'text/css': 'css',
  'text/x-scss': 'scss',
  'text/x-sass': 'sass',
  'text/x-less': 'less',
  'text/markdown': 'markdown',
  'text/yaml': 'yaml',
  'text/x-toml': 'toml',
  'text/x-ini': 'ini',
  'text/plain': 'plaintext',
  'text/csv': 'csv',
  'text/tab-separated-values': 'csv',
  'application/json': 'json',
  'application/xml': 'xml',
  'text/x-vue': 'vue',
  'image/svg+xml': 'xml',
};

// Get language from MIME type
const getLanguage = computed(() => {
  const mime = props.fileContent.mimeType;
  return mimeToLang[mime] || 'plaintext';
});

// Check if this is a markdown file
const isMarkdown = computed(() => {
  return props.fileContent.mimeType === 'text/markdown';
});

// Check if this is an image
const isImage = computed(() => {
  return props.fileContent.mimeType?.startsWith('image/') && props.fileContent.dataUrl;
});

// Check if this is HTML
const isHtml = computed(() => {
  return props.fileContent.mimeType === 'text/html';
});

// Check if content is available for preview
const hasContent = computed(() => {
  return !!props.fileContent.content;
});

// Markdown rendering
const createMarkdownRenderer = () => {
  const renderer = new marked.Renderer();

  renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
    const language = lang || 'plaintext';

    if (highlighter.value) {
      try {
        const loadedLangs = highlighter.value.getLoadedLanguages();
        const effectiveLang = loadedLangs.includes(language as BundledLanguage)
          ? language
          : 'plaintext';

        const highlighted = highlighter.value.codeToHtml(text, {
          lang: effectiveLang,
          theme: 'github-dark',
        });

        return `<div class="code-block">
          <div class="code-header">
            <span class="code-language">${language}</span>
          </div>
          ${highlighted}
        </div>`;
      } catch {
        // Fallback
      }
    }

    const escapedCode = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return `<div class="code-block">
      <div class="code-header">
        <span class="code-language">${language}</span>
      </div>
      <pre><code class="language-${language}">${escapedCode}</code></pre>
    </div>`;
  };

  renderer.codespan = ({ text }: { text: string }) => {
    return `<code class="inline-code">${text}</code>`;
  };

  renderer.link = ({ href, title, text }: { href: string; title?: string | null; text: string }) => {
    const titleAttr = title ? ` title="${title}"` : '';
    return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
  };

  return renderer;
};

const markedOptions: MarkedOptions = {
  breaks: true,
  gfm: true,
};

// Rendered markdown content
const renderedMarkdown = computed(() => {
  if (!props.fileContent.content || !isMarkdown.value) return '';

  try {
    const renderer = createMarkdownRenderer();
    const html = marked(props.fileContent.content, {
      ...markedOptions,
      renderer,
    }) as string;

    return DOMPurify.sanitize(html, {
      ADD_ATTR: ['target', 'rel'],
      ALLOW_DATA_ATTR: false,
    });
  } catch {
    return props.fileContent.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }
});

// Rendered HTML content (sanitized)
const renderedHtml = computed(() => {
  if (!props.fileContent.content || !isHtml.value) return '';

  return DOMPurify.sanitize(props.fileContent.content, {
    ADD_ATTR: ['target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
});

// Syntax-highlighted code content
const highlightedCode = computed(() => {
  if (!props.fileContent.content) return '';

  const content = props.fileContent.content;
  const lang = getLanguage.value;

  if (highlighter.value) {
    try {
      const loadedLangs = highlighter.value.getLoadedLanguages();
      const effectiveLang = loadedLangs.includes(lang as BundledLanguage) ? lang : 'plaintext';

      return highlighter.value.codeToHtml(content, {
        lang: effectiveLang,
        theme: 'github-dark',
      });
    } catch {
      // Fallback
    }
  }

  // Plain text fallback
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<pre><code>${escaped}</code></pre>`;
});

// Get lines for line numbers
const lineCount = computed(() => {
  if (!props.fileContent.content) return 0;
  return props.fileContent.content.split('\n').length;
});

// Format file size
const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
</script>

<template>
  <div class="file-preview">
    <!-- Image preview -->
    <div v-if="isImage" class="image-preview">
      <img :src="fileContent.dataUrl" :alt="fileContent.name" />
    </div>

    <!-- Rendered markdown -->
    <div
      v-else-if="isMarkdown && previewMode === 'rendered' && hasContent"
      class="rendered-content markdown-content"
      v-html="renderedMarkdown"
    />

    <!-- Rendered HTML -->
    <div
      v-else-if="isHtml && previewMode === 'rendered' && hasContent"
      class="rendered-content html-content"
      v-html="renderedHtml"
    />

    <!-- Code view (raw source) -->
    <div v-else-if="hasContent" class="code-preview">
      <div class="line-numbers">
        <span v-for="n in lineCount" :key="n" class="line-number">{{ n }}</span>
      </div>
      <div class="code-content" v-html="highlightedCode" />
    </div>

    <!-- No preview available -->
    <div v-else class="no-preview">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <p class="no-preview-title">{{ fileContent.message || 'Preview not available' }}</p>
      <p class="no-preview-info">
        {{ fileContent.name }} - {{ formatSize(fileContent.size) }}
      </p>
      <p class="no-preview-hint">Download the file to view its contents</p>
    </div>

    <!-- Truncation warning -->
    <div v-if="fileContent.truncated" class="truncation-warning">
      Content was truncated due to file size. Download to view full content.
    </div>
  </div>
</template>

<style scoped>
.file-preview {
  height: 100%;
  overflow: auto;
}

/* Image preview */
.image-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  min-height: 200px;
}

.image-preview img {
  max-width: 100%;
  max-height: calc(100vh - 200px);
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Rendered content (markdown/HTML) */
.rendered-content {
  padding: 24px;
  line-height: 1.7;
  word-break: break-word;
}

/* Markdown styles */
.markdown-content :deep(h1) {
  font-size: 1.75em;
  font-weight: 700;
  margin: 1.5em 0 0.75em 0;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #e5e5e5;
  color: #171717;
}

.markdown-content :deep(h1:first-child) {
  margin-top: 0;
}

.markdown-content :deep(h2) {
  font-size: 1.5em;
  font-weight: 600;
  margin: 1.25em 0 0.5em 0;
  color: #171717;
}

.markdown-content :deep(h3) {
  font-size: 1.25em;
  font-weight: 600;
  margin: 1em 0 0.5em 0;
  color: #171717;
}

.markdown-content :deep(p) {
  margin: 0.75em 0;
  color: #333;
}

.markdown-content :deep(p:first-child) {
  margin-top: 0;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.75em 0;
  padding-left: 1.5em;
}

.markdown-content :deep(li) {
  margin: 0.25em 0;
}

.markdown-content :deep(blockquote) {
  margin: 1em 0;
  padding: 0.5em 1em;
  border-left: 4px solid #d4a574;
  background: #faf8f5;
  color: #57606a;
}

.markdown-content :deep(a) {
  color: #0969da;
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

.markdown-content :deep(.code-block) {
  margin: 1em 0;
  border-radius: 8px;
  overflow: hidden;
  background: #24292e;
}

.markdown-content :deep(.code-header) {
  display: flex;
  padding: 8px 12px;
  background: #1f2428;
  border-bottom: 1px solid #30363d;
}

.markdown-content :deep(.code-language) {
  font-size: 12px;
  color: #8b949e;
}

.markdown-content :deep(.code-block pre) {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
}

.markdown-content :deep(.code-block code) {
  font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.markdown-content :deep(.inline-code) {
  font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
  font-size: 0.9em;
  padding: 0.2em 0.4em;
  background: #f0f0f0;
  border-radius: 4px;
  color: #c7254e;
}

.markdown-content :deep(table) {
  width: 100%;
  margin: 1em 0;
  border-collapse: collapse;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  padding: 8px 12px;
  border: 1px solid #d0d7de;
  text-align: left;
}

.markdown-content :deep(th) {
  font-weight: 600;
  background: #f6f8fa;
}

/* Code preview with line numbers */
.code-preview {
  display: flex;
  background: #24292e;
  min-height: 100%;
}

.line-numbers {
  flex-shrink: 0;
  padding: 16px 0;
  text-align: right;
  user-select: none;
  background: #1f2428;
  border-right: 1px solid #30363d;
}

.line-number {
  display: block;
  padding: 0 12px;
  font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #6e7681;
}

.code-content {
  flex: 1;
  padding: 16px;
  overflow-x: auto;
}

.code-content :deep(pre) {
  margin: 0;
  background: transparent !important;
}

.code-content :deep(code) {
  font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
}

/* No preview state */
.no-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
  color: #666;
  text-align: center;
}

.no-preview svg {
  color: #ccc;
  margin-bottom: 16px;
}

.no-preview-title {
  font-size: 14px;
  font-weight: 500;
  margin: 0 0 8px;
  color: #171717;
}

.no-preview-info {
  font-size: 13px;
  margin: 0 0 4px;
  color: #666;
}

.no-preview-hint {
  font-size: 12px;
  margin: 0;
  color: #999;
}

/* Truncation warning */
.truncation-warning {
  position: sticky;
  bottom: 0;
  padding: 12px 20px;
  background: #fff8e1;
  border-top: 1px solid #ffe082;
  color: #f57c00;
  font-size: 13px;
  text-align: center;
}
</style>

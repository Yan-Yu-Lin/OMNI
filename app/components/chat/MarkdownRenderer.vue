<template>
  <div class="markdown-content" v-html="renderedContent" />
</template>

<script setup lang="ts">
import { marked, type MarkedOptions } from 'marked';
import DOMPurify from 'dompurify';
import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki';

const props = defineProps<{
  content: string;
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

// Custom renderer for code blocks with syntax highlighting
const createRenderer = () => {
  const renderer = new marked.Renderer();

  // Code block rendering with Shiki
  renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
    const language = lang || 'plaintext';

    if (highlighter.value) {
      try {
        // Check if language is supported, fallback to plaintext
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
            <button class="copy-button" onclick="navigator.clipboard.writeText(this.closest('.code-block').querySelector('code').textContent)">
              Copy
            </button>
          </div>
          ${highlighted}
        </div>`;
      } catch (e) {
        // Fallback if highlighting fails
        console.warn('Shiki highlighting failed:', e);
      }
    }

    // Fallback without syntax highlighting
    const escapedCode = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return `<div class="code-block">
      <div class="code-header">
        <span class="code-language">${language}</span>
        <button class="copy-button" onclick="navigator.clipboard.writeText(this.closest('.code-block').querySelector('code').textContent)">
          Copy
        </button>
      </div>
      <pre><code class="language-${language}">${escapedCode}</code></pre>
    </div>`;
  };

  // Inline code rendering
  renderer.codespan = ({ text }: { text: string }) => {
    return `<code class="inline-code">${text}</code>`;
  };

  // Links open in new tab
  renderer.link = ({
    href,
    title,
    text,
  }: {
    href: string;
    title?: string | null;
    text: string;
  }) => {
    const titleAttr = title ? ` title="${title}"` : '';
    return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
  };

  return renderer;
};

// Marked options
const markedOptions: MarkedOptions = {
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
};

// Render markdown to sanitized HTML
const renderedContent = computed(() => {
  if (!props.content) return '';

  try {
    // Create renderer with current highlighter state
    const renderer = createRenderer();

    // Parse markdown
    const html = marked(props.content, {
      ...markedOptions,
      renderer,
    }) as string;

    // Sanitize HTML to prevent XSS
    const sanitized = DOMPurify.sanitize(html, {
      ADD_ATTR: ['target', 'rel', 'onclick'], // Allow these attributes
      ADD_TAGS: ['button'], // Allow button for copy functionality
      ALLOW_DATA_ATTR: false,
    });

    return sanitized;
  } catch (error) {
    console.error('Markdown rendering error:', error);
    // Fallback to escaped plain text
    return props.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }
});

// Re-render when highlighter becomes available
watch(highlighter, () => {
  // Force re-computation by triggering reactivity
});
</script>

<style scoped>
.markdown-content {
  line-height: 1.7;
  word-break: break-word;
}

/* Headings */
.markdown-content :deep(h1) {
  font-size: 1.75em;
  font-weight: 700;
  margin: 1.5em 0 0.75em 0;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #e5e5e5;
}

.markdown-content :deep(h2) {
  font-size: 1.5em;
  font-weight: 600;
  margin: 1.25em 0 0.5em 0;
  padding-bottom: 0.25em;
  border-bottom: 1px solid #e5e5e5;
}

.markdown-content :deep(h3) {
  font-size: 1.25em;
  font-weight: 600;
  margin: 1em 0 0.5em 0;
}

.markdown-content :deep(h4) {
  font-size: 1.1em;
  font-weight: 600;
  margin: 1em 0 0.5em 0;
}

.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  font-size: 1em;
  font-weight: 600;
  margin: 1em 0 0.5em 0;
}

/* First heading should not have top margin */
.markdown-content :deep(h1:first-child),
.markdown-content :deep(h2:first-child),
.markdown-content :deep(h3:first-child),
.markdown-content :deep(h4:first-child),
.markdown-content :deep(h5:first-child),
.markdown-content :deep(h6:first-child) {
  margin-top: 0;
}

/* Paragraphs */
.markdown-content :deep(p) {
  margin: 0.75em 0;
}

.markdown-content :deep(p:first-child) {
  margin-top: 0;
}

.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}

/* Code blocks */
.markdown-content :deep(.code-block) {
  margin: 1em 0;
  border-radius: 8px;
  overflow: hidden;
  background: #24292e;
}

.markdown-content :deep(.code-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #1f2428;
  border-bottom: 1px solid #30363d;
}

.markdown-content :deep(.code-language) {
  font-size: 12px;
  font-weight: 500;
  color: #8b949e;
  text-transform: lowercase;
}

.markdown-content :deep(.copy-button) {
  font-size: 12px;
  padding: 4px 10px;
  background: #30363d;
  border: 1px solid #484f58;
  border-radius: 6px;
  color: #c9d1d9;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.markdown-content :deep(.copy-button:hover) {
  background: #484f58;
  border-color: #6e7681;
}

.markdown-content :deep(.code-block pre) {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  background: #24292e;
}

.markdown-content :deep(.code-block code) {
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
}

/* Inline code */
.markdown-content :deep(.inline-code) {
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 0.9em;
  padding: 0.2em 0.4em;
  background: #f0f0f0;
  border-radius: 4px;
  color: #c7254e;
}

/* Lists */
.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.75em 0;
  padding-left: 1.5em;
}

.markdown-content :deep(li) {
  margin: 0.25em 0;
}

.markdown-content :deep(li > ul),
.markdown-content :deep(li > ol) {
  margin: 0.25em 0;
}

/* Blockquotes */
.markdown-content :deep(blockquote) {
  margin: 1em 0;
  padding: 0.5em 1em;
  border-left: 4px solid #d0d7de;
  background: #f6f8fa;
  color: #57606a;
}

.markdown-content :deep(blockquote p) {
  margin: 0;
}

/* Links */
.markdown-content :deep(a) {
  color: #0969da;
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

/* Tables */
.markdown-content :deep(table) {
  width: 100%;
  margin: 1em 0;
  border-collapse: collapse;
  overflow-x: auto;
  display: block;
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

.markdown-content :deep(tr:nth-child(even)) {
  background: #f6f8fa;
}

/* Horizontal rules */
.markdown-content :deep(hr) {
  margin: 1.5em 0;
  border: none;
  border-top: 1px solid #d0d7de;
}

/* Strong and emphasis */
.markdown-content :deep(strong) {
  font-weight: 600;
}

.markdown-content :deep(em) {
  font-style: italic;
}

/* Images */
.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

/* Task lists (GFM) */
.markdown-content :deep(ul.contains-task-list) {
  list-style: none;
  padding-left: 0;
}

.markdown-content :deep(li.task-list-item) {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.markdown-content :deep(input[type='checkbox']) {
  margin-top: 0.35em;
}
</style>

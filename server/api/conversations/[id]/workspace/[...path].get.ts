import { readFile, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { join, extname, basename } from 'path';
import { DockerSandbox } from '../../../../utils/docker';

// MIME type mapping for common file extensions
const mimeTypes: Record<string, string> = {
  // Text/Code
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.csv': 'text/csv',
  '.tsv': 'text/tab-separated-values',
  '.log': 'text/plain',

  // Programming languages
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.cjs': 'text/javascript',
  '.ts': 'text/typescript',
  '.tsx': 'text/typescript',
  '.jsx': 'text/javascript',
  '.vue': 'text/x-vue',
  '.py': 'text/x-python',
  '.rb': 'text/x-ruby',
  '.go': 'text/x-go',
  '.rs': 'text/x-rust',
  '.java': 'text/x-java',
  '.kt': 'text/x-kotlin',
  '.swift': 'text/x-swift',
  '.c': 'text/x-c',
  '.cpp': 'text/x-c++',
  '.h': 'text/x-c',
  '.hpp': 'text/x-c++',
  '.cs': 'text/x-csharp',
  '.php': 'text/x-php',
  '.sql': 'text/x-sql',
  '.sh': 'text/x-shellscript',
  '.bash': 'text/x-shellscript',
  '.zsh': 'text/x-shellscript',

  // Web
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.scss': 'text/x-scss',
  '.sass': 'text/x-sass',
  '.less': 'text/x-less',

  // Config
  '.toml': 'text/x-toml',
  '.ini': 'text/x-ini',
  '.conf': 'text/plain',
  '.env': 'text/plain',
  '.gitignore': 'text/plain',
  '.dockerignore': 'text/plain',

  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',

  // Documents
  '.pdf': 'application/pdf',

  // Archives
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed',
};

function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

function isTextFile(mimeType: string): boolean {
  return (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml' ||
    mimeType === 'image/svg+xml'
  );
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const pathSegments = getRouterParam(event, 'path');

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Conversation ID is required',
    });
  }

  if (!pathSegments) {
    throw createError({
      statusCode: 400,
      message: 'File path is required',
    });
  }

  // pathSegments is a string with segments joined by '/'
  const filePath = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;
  const workspacePath = DockerSandbox.getWorkspacePath(id);
  const fullPath = join(workspacePath, filePath);

  // Security: ensure the resolved path is within workspace
  if (!fullPath.startsWith(workspacePath)) {
    throw createError({
      statusCode: 403,
      message: 'Access denied: path traversal attempt',
    });
  }

  // Check if file exists
  try {
    const stats = await stat(fullPath);
    if (stats.isDirectory()) {
      throw createError({
        statusCode: 400,
        message: 'Cannot read a directory',
      });
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw createError({
        statusCode: 404,
        message: 'File not found',
      });
    }
    throw error;
  }

  const query = getQuery(event);
  const download = query.download === 'true';
  const mimeType = getMimeType(fullPath);
  const fileName = basename(fullPath);

  // Set response headers
  setHeader(event, 'Content-Type', mimeType);

  if (download) {
    // Force download
    setHeader(event, 'Content-Disposition', `attachment; filename="${fileName}"`);
    return sendStream(event, createReadStream(fullPath));
  }

  // For text files, return content as JSON for preview
  if (isTextFile(mimeType)) {
    try {
      const stats = await stat(fullPath);

      // Limit preview size to 1MB
      if (stats.size > 1024 * 1024) {
        return {
          path: filePath,
          name: fileName,
          mimeType,
          size: stats.size,
          truncated: true,
          content: await readFile(fullPath, 'utf-8').then((c) => c.slice(0, 1024 * 1024)),
          message: 'File too large for preview. Download to view full content.',
        };
      }

      const content = await readFile(fullPath, 'utf-8');

      return {
        path: filePath,
        name: fileName,
        mimeType,
        size: stats.size,
        truncated: false,
        content,
      };
    } catch (error) {
      throw createError({
        statusCode: 500,
        message: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  // For images, return as base64 data URL for preview
  if (mimeType.startsWith('image/')) {
    try {
      const stats = await stat(fullPath);

      // Limit image preview to 5MB
      if (stats.size > 5 * 1024 * 1024) {
        return {
          path: filePath,
          name: fileName,
          mimeType,
          size: stats.size,
          preview: false,
          message: 'Image too large for preview. Download to view.',
        };
      }

      const buffer = await readFile(fullPath);
      const base64 = buffer.toString('base64');

      return {
        path: filePath,
        name: fileName,
        mimeType,
        size: stats.size,
        preview: true,
        dataUrl: `data:${mimeType};base64,${base64}`,
      };
    } catch (error) {
      throw createError({
        statusCode: 500,
        message: `Failed to read image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  // For other binary files, return metadata only
  const stats = await stat(fullPath);
  return {
    path: filePath,
    name: fileName,
    mimeType,
    size: stats.size,
    preview: false,
    message: 'Binary file. Download to view.',
  };
});

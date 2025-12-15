import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { DockerSandbox } from '../../../../utils/docker';

export interface WorkspaceFile {
  name: string;
  path: string;
  size: number;
  type: 'file' | 'directory';
  modifiedAt: string;
  children?: WorkspaceFile[];
}

async function scanDirectory(dirPath: string, basePath: string): Promise<WorkspaceFile[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files: WorkspaceFile[] = [];

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    const relativePath = relative(basePath, fullPath);

    try {
      const stats = await stat(fullPath);

      if (entry.isDirectory()) {
        // Skip common large/irrelevant directories
        if (['node_modules', '.git', '__pycache__', '.venv', 'venv', '.cache'].includes(entry.name)) {
          continue;
        }

        const children = await scanDirectory(fullPath, basePath);
        files.push({
          name: entry.name,
          path: relativePath,
          size: 0,
          type: 'directory',
          modifiedAt: stats.mtime.toISOString(),
          children,
        });
      } else {
        files.push({
          name: entry.name,
          path: relativePath,
          size: stats.size,
          type: 'file',
          modifiedAt: stats.mtime.toISOString(),
        });
      }
    } catch {
      // Skip files we can't access
      continue;
    }
  }

  // Sort: directories first, then alphabetically
  return files.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Conversation ID is required',
    });
  }

  const workspacePath = DockerSandbox.getWorkspacePath(id);

  try {
    // Check if workspace directory exists
    await stat(workspacePath);
  } catch {
    // Directory doesn't exist - return empty files array
    return {
      conversationId: id,
      files: [],
    };
  }

  try {
    const files = await scanDirectory(workspacePath, workspacePath);

    return {
      conversationId: id,
      files,
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to read workspace: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

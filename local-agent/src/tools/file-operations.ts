import { readFile, writeFile, readdir, stat, mkdir } from 'fs/promises';
import { join, dirname, resolve } from 'path';
import { homedir } from 'os';
import * as logger from '../logger';

export interface FileInfo {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modified: Date;
}

/**
 * Validate and resolve file path
 * - Must be absolute
 * - Resolve symlinks and relative paths
 * - Check for path traversal attempts
 */
function validatePath(path: string): string {
  // Ensure absolute path
  const resolved = resolve(path);

  // Check for suspicious patterns
  if (path.includes('..') && !resolved.startsWith(homedir())) {
    throw new Error('Path traversal detected');
  }

  return resolved;
}

/**
 * Read file contents
 */
export async function readFileContents(path: string): Promise<{ content: string; size: number; path: string }> {
  try {
    const validPath = validatePath(path);

    logger.info(`Reading file: ${validPath}`);

    const stats = await stat(validPath);

    if (stats.isDirectory()) {
      throw new Error('Path is a directory, not a file');
    }

    // Limit file size (max 10MB for safety)
    if (stats.size > 10 * 1024 * 1024) {
      throw new Error('File too large (max 10MB)');
    }

    const content = await readFile(validPath, 'utf-8');

    logger.info(`Successfully read file: ${validPath} (${stats.size} bytes)`);

    return {
      content,
      size: stats.size,
      path: validPath,
    };
  } catch (error: any) {
    logger.error(`Failed to read file: ${path}`, error);

    // Map error codes to user-friendly messages
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${path}`);
    } else if (error.code === 'EACCES') {
      throw new Error(`Permission denied: ${path}`);
    } else if (error.code === 'EISDIR') {
      throw new Error(`Path is a directory: ${path}`);
    }

    throw error;
  }
}

/**
 * Write file contents
 */
export async function writeFileContents(
  path: string,
  content: string
): Promise<{ success: boolean; bytesWritten: number; path: string }> {
  try {
    const validPath = validatePath(path);

    logger.info(`Writing file: ${validPath} (${content.length} bytes)`);

    // Create parent directory if it doesn't exist
    const parentDir = dirname(validPath);
    await mkdir(parentDir, { recursive: true });

    // Write file
    await writeFile(validPath, content, 'utf-8');

    logger.info(`Successfully wrote file: ${validPath}`);

    return {
      success: true,
      bytesWritten: Buffer.byteLength(content, 'utf-8'),
      path: validPath,
    };
  } catch (error: any) {
    logger.error(`Failed to write file: ${path}`, error);

    if (error.code === 'EACCES') {
      throw new Error(`Permission denied: ${path}`);
    } else if (error.code === 'ENOSPC') {
      throw new Error('No space left on device');
    }

    throw error;
  }
}

/**
 * List files in directory
 */
export async function listFilesInDirectory(
  path: string,
  recursive: boolean = false
): Promise<{ files: FileInfo[]; path: string }> {
  try {
    const validPath = validatePath(path);

    logger.info(`Listing files in: ${validPath} (recursive: ${recursive})`);

    const stats = await stat(validPath);

    if (!stats.isDirectory()) {
      throw new Error('Path is not a directory');
    }

    const entries = await readdir(validPath, { withFileTypes: true });

    const files: FileInfo[] = [];

    for (const entry of entries) {
      const fullPath = join(validPath, entry.name);
      const entryStat = await stat(fullPath);

      files.push({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        size: entryStat.size,
        modified: entryStat.mtime,
      });

      // Recursively list subdirectories
      if (recursive && entry.isDirectory()) {
        try {
          const subResult = await listFilesInDirectory(fullPath, true);
          files.push(
            ...subResult.files.map((f) => ({
              ...f,
              name: join(entry.name, f.name),
            }))
          );
        } catch (error) {
          // Skip directories we can't read
          logger.warn(`Skipping directory: ${fullPath}`, error);
        }
      }
    }

    logger.info(`Found ${files.length} items in: ${validPath}`);

    return {
      files,
      path: validPath,
    };
  } catch (error: any) {
    logger.error(`Failed to list files: ${path}`, error);

    if (error.code === 'ENOENT') {
      throw new Error(`Directory not found: ${path}`);
    } else if (error.code === 'EACCES') {
      throw new Error(`Permission denied: ${path}`);
    } else if (error.code === 'ENOTDIR') {
      throw new Error(`Not a directory: ${path}`);
    }

    throw error;
  }
}

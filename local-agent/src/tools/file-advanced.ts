import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Delete a file
 */
export async function deleteFile(filePath: string): Promise<string> {
  await fs.unlink(filePath);
  return `File deleted: ${filePath}`;
}

/**
 * Move or rename a file
 */
export async function moveFile(source: string, destination: string): Promise<string> {
  await fs.rename(source, destination);
  return `Moved ${source} to ${destination}`;
}

/**
 * Copy a file
 */
export async function copyFile(source: string, destination: string): Promise<string> {
  await fs.copyFile(source, destination);
  return `Copied ${source} to ${destination}`;
}

/**
 * Get file metadata
 */
export async function getFileInfo(filePath: string): Promise<any> {
  const stats = await fs.stat(filePath);
  return {
    path: filePath,
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime,
    accessed: stats.atime,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
    permissions: stats.mode.toString(8).slice(-3),
  };
}

/**
 * Search for files by pattern
 */
export async function searchFiles(
  searchPath: string,
  pattern: string,
  recursive: boolean = false
): Promise<string[]> {
  const globPattern = recursive
    ? path.join(searchPath, '**', pattern)
    : path.join(searchPath, pattern);

  const files = await glob(globPattern, { nodir: true });
  return files;
}

/**
 * Search file contents (grep)
 */
export async function searchContent(
  searchPath: string,
  query: string,
  filePattern?: string,
  recursive: boolean = true
): Promise<any> {
  try {
    // Use grep for efficient searching
    const grepCmd = recursive ? 'grep -r' : 'grep';
    const pattern = filePattern || '*';
    const includeFlag = filePattern ? `--include="${pattern}"` : '';

    const cmd = `${grepCmd} -n "${query}" ${includeFlag} "${searchPath}" 2>/dev/null || true`;
    const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });

    if (!stdout) {
      return { matches: [], count: 0 };
    }

    const lines = stdout.trim().split('\n');
    const matches = lines.map(line => {
      const match = line.match(/^(.+?):(\d+):(.+)$/);
      if (match) {
        return {
          file: match[1],
          line: parseInt(match[2]),
          content: match[3],
        };
      }
      return null;
    }).filter(Boolean);

    return {
      matches,
      count: matches.length,
    };
  } catch (error: any) {
    // Grep returns exit code 1 if no matches found
    if (error.code === 1) {
      return { matches: [], count: 0 };
    }
    throw error;
  }
}

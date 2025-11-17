import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Create a directory (with parents)
 */
export async function createDirectory(dirPath: string): Promise<string> {
  await fs.mkdir(dirPath, { recursive: true });
  return `Directory created: ${dirPath}`;
}

/**
 * Delete a directory and all contents
 */
export async function deleteDirectory(dirPath: string): Promise<string> {
  await fs.rm(dirPath, { recursive: true, force: true });
  return `Directory deleted: ${dirPath}`;
}

/**
 * Calculate directory size
 */
export async function getDirectorySize(dirPath: string): Promise<any> {
  let totalSize = 0;
  let fileCount = 0;
  let dirCount = 0;

  async function calculateSize(currentPath: string): Promise<void> {
    const stats = await fs.stat(currentPath);

    if (stats.isFile()) {
      totalSize += stats.size;
      fileCount++;
    } else if (stats.isDirectory()) {
      dirCount++;
      const entries = await fs.readdir(currentPath);

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry);
        await calculateSize(fullPath);
      }
    }
  }

  await calculateSize(dirPath);

  return {
    path: dirPath,
    totalSize,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    fileCount,
    dirCount,
  };
}

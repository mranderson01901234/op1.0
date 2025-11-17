import { readFileContents, writeFileContents, listFilesInDirectory } from './file-operations';
import { executeCommand } from './command-executor';
import { deleteFile, moveFile, copyFile, getFileInfo, searchFiles, searchContent } from './file-advanced';
import { createDirectory, deleteDirectory, getDirectorySize } from './directory-operations';
import {
  getSystemInfo,
  getProcessList,
  getEnvironmentVariables,
  getCurrentDirectory,
  getCPUUsage,
  getDiskSpace,
  getMemoryUsage,
  getNetworkInfo,
  getSystemHealth
} from './system-info';
import { runNpmCommand, getGitStatus, getGitDiff, installPackage } from './dev-tools';
import { checkFileOperation, isCommandAllowed, requiresConfirmation } from './permissions';
import * as logger from '../logger';
import { readFile } from 'fs/promises';

export interface ToolCall {
  tool: string;
  params: any;
}

export interface ToolResult {
  success: boolean;
  result?: any;
  error?: string;
  requiresConfirmation?: boolean;
  confirmationData?: {
    operation: string;
    path: string;
    fileType: 'critical' | 'safe' | 'destructive';
    oldContent?: string;
    newContent?: string;
    diff?: string;
  };
}

/**
 * Execute a tool with permission checks and error handling
 */
export async function executeTool(toolCall: ToolCall): Promise<ToolResult> {
  const { tool, params } = toolCall;

  logger.info(`Executing tool: ${tool}`, { params });

  try {
    switch (tool) {
      // File operations
      case 'read_file':
        return await executeReadFile(params);
      case 'write_file':
        return await executeWriteFile(params);
      case 'delete_file':
        return await executeDeleteFile(params);
      case 'move_file':
        return await executeMoveFile(params);
      case 'copy_file':
        return await executeCopyFile(params);
      case 'get_file_info':
        return await executeGetFileInfo(params);
      case 'search_files':
        return await executeSearchFiles(params);
      case 'search_content':
        return await executeSearchContent(params);

      // Directory operations
      case 'list_directory':
        return await executeListDirectory(params);
      case 'create_directory':
        return await executeCreateDirectory(params);
      case 'delete_directory':
        return await executeDeleteDirectory(params);
      case 'get_directory_size':
        return await executeGetDirectorySize(params);

      // System operations
      case 'execute_command':
        return await executeCommandTool(params);
      case 'get_system_info':
        return await executeGetSystemInfo(params);
      case 'get_process_list':
        return await executeGetProcessList(params);
      case 'get_environment_variables':
        return await executeGetEnvironmentVariables(params);
      case 'get_current_directory':
        return await executeGetCurrentDirectory(params);

      // System health monitoring
      case 'get_cpu_usage':
        return await executeGetCPUUsage(params);
      case 'get_disk_space':
        return await executeGetDiskSpace(params);
      case 'get_memory_usage':
        return await executeGetMemoryUsage(params);
      case 'get_network_info':
        return await executeGetNetworkInfo(params);
      case 'get_system_health':
        return await executeGetSystemHealth(params);

      // Development tools
      case 'run_npm_command':
        return await executeRunNpmCommand(params);
      case 'git_status':
        return await executeGitStatus(params);
      case 'git_diff':
        return await executeGitDiff(params);
      case 'install_package':
        return await executeInstallPackage(params);

      default:
        logger.warn(`Unknown tool: ${tool}`);
        return {
          success: false,
          error: `Unknown tool: ${tool}`,
        };
    }
  } catch (error: any) {
    logger.error(`Tool execution failed: ${tool}`, error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}

// ===== FILE OPERATIONS =====

async function executeReadFile(params: { path: string }): Promise<ToolResult> {
  const { path } = params;
  if (!path) return { success: false, error: 'Missing required parameter: path' };

  const permCheck = checkFileOperation('read', path);
  if (!permCheck.allowed) return { success: false, error: permCheck.reason };

  try {
    const result = await readFileContents(path);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeWriteFile(params: { path: string; content: string; skipConfirmation?: boolean }): Promise<ToolResult> {
  const { path, content, skipConfirmation } = params;
  if (!path || content === undefined) {
    return { success: false, error: 'Missing required parameters: path, content' };
  }

  const permCheck = checkFileOperation('write', path);
  if (!permCheck.allowed) return { success: false, error: permCheck.reason };

  // Check if confirmation is required
  if (!skipConfirmation) {
    const confirmCheck = requiresConfirmation('write', path);
    if (confirmCheck.requiresConfirmation) {
      // Try to read existing file content for diff
      let oldContent: string | undefined;
      try {
        const existing = await readFile(path, 'utf-8');
        oldContent = existing;
      } catch (error) {
        // File might not exist yet
        oldContent = '';
      }

      logger.info(`File operation requires confirmation: ${path}`, {
        fileType: confirmCheck.fileType,
        reason: confirmCheck.reason,
      });

      return {
        success: false,
        requiresConfirmation: true,
        confirmationData: {
          operation: 'write_file',
          path,
          fileType: confirmCheck.fileType || 'critical',
          oldContent,
          newContent: content,
        },
        error: confirmCheck.reason || 'User confirmation required',
      };
    }
  }

  try {
    const result = await writeFileContents(path, content);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeDeleteFile(params: { path: string }): Promise<ToolResult> {
  const { path } = params;
  if (!path) return { success: false, error: 'Missing required parameter: path' };

  const permCheck = checkFileOperation('delete', path);
  if (!permCheck.allowed) return { success: false, error: permCheck.reason };

  try {
    const result = await deleteFile(path);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeMoveFile(params: { source: string; destination: string }): Promise<ToolResult> {
  const { source, destination } = params;
  if (!source || !destination) {
    return { success: false, error: 'Missing required parameters: source, destination' };
  }

  const sourceCheck = checkFileOperation('read', source);
  if (!sourceCheck.allowed) return { success: false, error: `Source: ${sourceCheck.reason}` };

  const destCheck = checkFileOperation('write', destination);
  if (!destCheck.allowed) return { success: false, error: `Destination: ${destCheck.reason}` };

  try {
    const result = await moveFile(source, destination);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeCopyFile(params: { source: string; destination: string }): Promise<ToolResult> {
  const { source, destination } = params;
  if (!source || !destination) {
    return { success: false, error: 'Missing required parameters: source, destination' };
  }

  const sourceCheck = checkFileOperation('read', source);
  if (!sourceCheck.allowed) return { success: false, error: `Source: ${sourceCheck.reason}` };

  const destCheck = checkFileOperation('write', destination);
  if (!destCheck.allowed) return { success: false, error: `Destination: ${destCheck.reason}` };

  try {
    const result = await copyFile(source, destination);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeGetFileInfo(params: { path: string }): Promise<ToolResult> {
  const { path } = params;
  if (!path) return { success: false, error: 'Missing required parameter: path' };

  const permCheck = checkFileOperation('read', path);
  if (!permCheck.allowed) return { success: false, error: permCheck.reason };

  try {
    const result = await getFileInfo(path);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeSearchFiles(params: {
  path: string;
  pattern: string;
  recursive?: boolean;
}): Promise<ToolResult> {
  const { path, pattern, recursive } = params;
  if (!path || !pattern) {
    return { success: false, error: 'Missing required parameters: path, pattern' };
  }

  const permCheck = checkFileOperation('list', path);
  if (!permCheck.allowed) return { success: false, error: permCheck.reason };

  try {
    const result = await searchFiles(path, pattern, recursive);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeSearchContent(params: {
  path: string;
  query: string;
  file_pattern?: string;
  recursive?: boolean;
}): Promise<ToolResult> {
  const { path, query, file_pattern, recursive } = params;
  if (!path || !query) {
    return { success: false, error: 'Missing required parameters: path, query' };
  }

  const permCheck = checkFileOperation('read', path);
  if (!permCheck.allowed) return { success: false, error: permCheck.reason };

  try {
    const result = await searchContent(path, query, file_pattern, recursive);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ===== DIRECTORY OPERATIONS =====

async function executeListDirectory(params: { path: string; recursive?: boolean }): Promise<ToolResult> {
  const { path, recursive = false } = params;
  if (!path) return { success: false, error: 'Missing required parameter: path' };

  const permCheck = checkFileOperation('list', path);
  if (!permCheck.allowed) return { success: false, error: permCheck.reason };

  try {
    const result = await listFilesInDirectory(path, recursive);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeCreateDirectory(params: { path: string }): Promise<ToolResult> {
  const { path } = params;
  if (!path) return { success: false, error: 'Missing required parameter: path' };

  const permCheck = checkFileOperation('write', path);
  if (!permCheck.allowed) return { success: false, error: permCheck.reason };

  try {
    const result = await createDirectory(path);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeDeleteDirectory(params: { path: string }): Promise<ToolResult> {
  const { path } = params;
  if (!path) return { success: false, error: 'Missing required parameter: path' };

  const permCheck = checkFileOperation('delete', path);
  if (!permCheck.allowed) return { success: false, error: permCheck.reason };

  try {
    const result = await deleteDirectory(path);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeGetDirectorySize(params: { path: string }): Promise<ToolResult> {
  const { path } = params;
  if (!path) return { success: false, error: 'Missing required parameter: path' };

  const permCheck = checkFileOperation('read', path);
  if (!permCheck.allowed) return { success: false, error: permCheck.reason };

  try {
    const result = await getDirectorySize(path);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ===== SYSTEM OPERATIONS =====

async function executeCommandTool(params: {
  command: string;
  cwd?: string;
  timeout?: number;
}): Promise<ToolResult> {
  const { command, cwd, timeout } = params;
  if (!command) return { success: false, error: 'Missing required parameter: command' };

  const permCheck = isCommandAllowed(command);
  if (!permCheck.allowed) return { success: false, error: permCheck.reason };

  if (cwd) {
    const cwdCheck = checkFileOperation('read', cwd);
    if (!cwdCheck.allowed) {
      return { success: false, error: `Working directory not allowed: ${cwdCheck.reason}` };
    }
  }

  try {
    const result = await executeCommand(command, cwd, timeout);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeGetSystemInfo(params: {}): Promise<ToolResult> {
  try {
    const result = await getSystemInfo();
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeGetProcessList(params: { filter?: string }): Promise<ToolResult> {
  try {
    const result = await getProcessList(params.filter);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeGetEnvironmentVariables(params: { names?: string }): Promise<ToolResult> {
  try {
    const result = getEnvironmentVariables(params.names);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeGetCurrentDirectory(params: {}): Promise<ToolResult> {
  try {
    const result = getCurrentDirectory();
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ===== SYSTEM HEALTH MONITORING =====

async function executeGetCPUUsage(params: {}): Promise<ToolResult> {
  try {
    const result = await getCPUUsage();
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeGetDiskSpace(params: { path?: string }): Promise<ToolResult> {
  try {
    const result = await getDiskSpace(params.path);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeGetMemoryUsage(params: {}): Promise<ToolResult> {
  try {
    const result = getMemoryUsage();
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeGetNetworkInfo(params: {}): Promise<ToolResult> {
  try {
    const result = getNetworkInfo();
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeGetSystemHealth(params: {}): Promise<ToolResult> {
  try {
    const result = await getSystemHealth();
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ===== DEVELOPMENT TOOLS =====

async function executeRunNpmCommand(params: {
  command: string;
  cwd: string;
  package_manager?: string;
}): Promise<ToolResult> {
  const { command, cwd, package_manager } = params;
  if (!command || !cwd) {
    return { success: false, error: 'Missing required parameters: command, cwd' };
  }

  const permCheck = checkFileOperation('read', cwd);
  if (!permCheck.allowed) return { success: false, error: permCheck.reason };

  try {
    const result = await runNpmCommand(command, cwd, package_manager);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeGitStatus(params: { path: string }): Promise<ToolResult> {
  const { path } = params;
  if (!path) return { success: false, error: 'Missing required parameter: path' };

  const permCheck = checkFileOperation('read', path);
  if (!permCheck.allowed) return { success: false, error: permCheck.reason };

  try {
    const result = await getGitStatus(path);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeGitDiff(params: { path: string; staged?: boolean }): Promise<ToolResult> {
  const { path, staged } = params;
  if (!path) return { success: false, error: 'Missing required parameter: path' };

  const permCheck = checkFileOperation('read', path);
  if (!permCheck.allowed) return { success: false, error: permCheck.reason };

  try {
    const result = await getGitDiff(path, staged);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeInstallPackage(params: {
  package_name: string;
  cwd: string;
  dev?: boolean;
  package_manager?: string;
}): Promise<ToolResult> {
  const { package_name, cwd, dev, package_manager } = params;
  if (!package_name || !cwd) {
    return { success: false, error: 'Missing required parameters: package_name, cwd' };
  }

  const permCheck = checkFileOperation('write', cwd);
  if (!permCheck.allowed) return { success: false, error: permCheck.reason };

  try {
    const result = await installPackage(package_name, cwd, dev, package_manager);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get list of available tools
 */
export function getAvailableTools(): string[] {
  return [
    // File operations
    'read_file',
    'write_file',
    'delete_file',
    'move_file',
    'copy_file',
    'get_file_info',
    'search_files',
    'search_content',
    // Directory operations
    'list_directory',
    'create_directory',
    'delete_directory',
    'get_directory_size',
    // System operations
    'execute_command',
    'get_system_info',
    'get_process_list',
    'get_environment_variables',
    'get_current_directory',
    // System health monitoring
    'get_cpu_usage',
    'get_disk_space',
    'get_memory_usage',
    'get_network_info',
    'get_system_health',
    // Development tools
    'run_npm_command',
    'git_status',
    'git_diff',
    'install_package',
  ];
}

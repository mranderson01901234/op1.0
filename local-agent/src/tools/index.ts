import { readFileContents, writeFileContents, listFilesInDirectory } from './file-operations';
import { executeCommand } from './command-executor';
import { checkFileOperation, isCommandAllowed } from './permissions';
import * as logger from '../logger';

export interface ToolCall {
  tool: string;
  params: any;
}

export interface ToolResult {
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Execute a tool with permission checks and error handling
 */
export async function executeTool(toolCall: ToolCall): Promise<ToolResult> {
  const { tool, params } = toolCall;

  logger.info(`Executing tool: ${tool}`, { params });

  try {
    switch (tool) {
      case 'read_file':
        return await executeReadFile(params);

      case 'write_file':
        return await executeWriteFile(params);

      case 'list_directory':
        return await executeListDirectory(params);

      case 'execute_command':
        return await executeCommandTool(params);

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

/**
 * Read file tool
 */
async function executeReadFile(params: { path: string }): Promise<ToolResult> {
  const { path } = params;

  if (!path) {
    return { success: false, error: 'Missing required parameter: path' };
  }

  // Check permissions
  const permCheck = checkFileOperation('read', path);
  if (!permCheck.allowed) {
    return { success: false, error: permCheck.reason };
  }

  try {
    const result = await readFileContents(path);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Write file tool
 */
async function executeWriteFile(params: { path: string; content: string }): Promise<ToolResult> {
  const { path, content } = params;

  if (!path || content === undefined) {
    return { success: false, error: 'Missing required parameters: path, content' };
  }

  // Check permissions
  const permCheck = checkFileOperation('write', path);
  if (!permCheck.allowed) {
    return { success: false, error: permCheck.reason };
  }

  try {
    const result = await writeFileContents(path, content);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * List directory tool
 */
async function executeListDirectory(params: { path: string; recursive?: boolean }): Promise<ToolResult> {
  const { path, recursive = false } = params;

  if (!path) {
    return { success: false, error: 'Missing required parameter: path' };
  }

  // Check permissions
  const permCheck = checkFileOperation('list', path);
  if (!permCheck.allowed) {
    return { success: false, error: permCheck.reason };
  }

  try {
    const result = await listFilesInDirectory(path, recursive);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Execute command tool
 */
async function executeCommandTool(params: {
  command: string;
  cwd?: string;
  timeout?: number;
}): Promise<ToolResult> {
  const { command, cwd, timeout } = params;

  if (!command) {
    return { success: false, error: 'Missing required parameter: command' };
  }

  // Check permissions
  const permCheck = isCommandAllowed(command);
  if (!permCheck.allowed) {
    return { success: false, error: permCheck.reason };
  }

  // If cwd is specified, check path permissions
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

/**
 * Get list of available tools
 */
export function getAvailableTools(): string[] {
  return ['read_file', 'write_file', 'list_directory', 'execute_command'];
}

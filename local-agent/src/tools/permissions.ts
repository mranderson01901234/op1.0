import { resolve, relative } from 'path';
import { homedir } from 'os';
import { loadConfig } from '../config';
import * as logger from '../logger';

export type PermissionMode = 'safe' | 'balanced' | 'unrestricted';

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * Dangerous commands blocked in 'safe' and 'balanced' modes
 */
const RESTRICTED_COMMANDS = {
  safe: [
    'rm', 'rmdir', 'del', 'format', 'mkfs', 'dd',
    'shutdown', 'reboot', 'init', 'systemctl',
    'chmod', 'chown', 'sudo', 'su',
    'curl', 'wget', 'nc', 'netcat',
  ],
  balanced: [
    'format', 'mkfs', 'dd',
    'shutdown', 'reboot', 'init',
    'sudo', 'su',
  ],
};

/**
 * Check if a path is within allowed directories
 */
export function isPathAllowed(path: string): PermissionCheck {
  const config = loadConfig();
  const allowedDirs = config.permissions.allowedDirectories;

  // Unrestricted mode allows all paths
  if (config.permissions.mode === 'unrestricted') {
    return { allowed: true };
  }

  // Resolve absolute path
  const absolutePath = resolve(path);

  // Check if path is within any allowed directory
  for (const allowedDir of allowedDirs) {
    const allowedAbsolute = resolve(allowedDir);
    const relativePath = relative(allowedAbsolute, absolutePath);

    // If relative path doesn't start with '..', it's within the allowed directory
    if (!relativePath.startsWith('..') && !relativePath.startsWith('/')) {
      logger.info(`Path allowed: ${absolutePath} is within ${allowedAbsolute}`);
      return { allowed: true };
    }
  }

  logger.warn(`Path blocked: ${absolutePath} is not within allowed directories`, {
    allowedDirs,
  });

  return {
    allowed: false,
    reason: `Path '${path}' is outside allowed directories. Allowed: ${allowedDirs.join(', ')}`,
  };
}

/**
 * Check if a command is allowed based on permission mode
 */
export function isCommandAllowed(command: string): PermissionCheck {
  const config = loadConfig();
  const mode = config.permissions.mode;

  // Unrestricted mode allows all commands
  if (mode === 'unrestricted') {
    return { allowed: true };
  }

  // Get restricted commands for current mode
  const restrictedList = mode === 'safe' ? RESTRICTED_COMMANDS.safe : RESTRICTED_COMMANDS.balanced;

  // Check if command starts with any restricted command
  const commandLower = command.toLowerCase().trim();

  for (const restricted of restrictedList) {
    // Check for exact match or command starting with restricted word
    if (
      commandLower === restricted ||
      commandLower.startsWith(`${restricted} `) ||
      commandLower.includes(`|${restricted} `) ||
      commandLower.includes(`&&${restricted} `) ||
      commandLower.includes(`;${restricted} `)
    ) {
      logger.warn(`Command blocked in '${mode}' mode: ${command}`, { restricted });
      return {
        allowed: false,
        reason: `Command '${restricted}' is not allowed in '${mode}' permission mode`,
      };
    }
  }

  logger.info(`Command allowed in '${mode}' mode: ${command}`);
  return { allowed: true };
}

/**
 * Check if file operation is allowed
 */
export function checkFileOperation(
  operation: 'read' | 'write' | 'list',
  path: string
): PermissionCheck {
  const config = loadConfig();
  const mode = config.permissions.mode;

  // Check path first
  const pathCheck = isPathAllowed(path);
  if (!pathCheck.allowed) {
    return pathCheck;
  }

  // In 'safe' mode, only allow read operations
  if (mode === 'safe' && operation === 'write') {
    logger.warn(`Write operation blocked in 'safe' mode: ${path}`);
    return {
      allowed: false,
      reason: "Write operations are not allowed in 'safe' mode. Change to 'balanced' or 'unrestricted' mode.",
    };
  }

  return { allowed: true };
}

/**
 * Get current permission mode
 */
export function getPermissionMode(): PermissionMode {
  try {
    const config = loadConfig();
    return config.permissions.mode;
  } catch (error) {
    logger.error('Failed to load permission mode, defaulting to safe', error);
    return 'safe';
  }
}

/**
 * Get allowed directories
 */
export function getAllowedDirectories(): string[] {
  try {
    const config = loadConfig();
    return config.permissions.allowedDirectories;
  } catch (error) {
    logger.error('Failed to load allowed directories, defaulting to home', error);
    return [homedir()];
  }
}

import { resolve, relative, basename } from 'path';
import { homedir } from 'os';
import { loadConfig } from '../config';
import * as logger from '../logger';

export type PermissionMode = 'safe' | 'balanced' | 'unrestricted';

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  requiresConfirmation?: boolean;
  fileType?: 'critical' | 'safe' | 'destructive';
}

/**
 * Critical files that always require user confirmation in balanced mode
 */
const CRITICAL_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'tsconfig.json',
  'jsconfig.json',
  'next.config.js',
  'next.config.mjs',
  'webpack.config.js',
  'vite.config.js',
  'vite.config.ts',
  '.gitignore',
  'Dockerfile',
  'docker-compose.yml',
  'credentials.json',
  'service-account.json',
];

/**
 * Critical directories that require confirmation
 */
const CRITICAL_DIRS = [
  '.git',
  'node_modules',
  '.next',
  'dist',
  'build',
];

/**
 * Safe directories where files can be auto-approved in balanced mode
 */
const SAFE_DIRS = [
  'src',
  'app',
  'pages',
  'components',
  'lib',
  'utils',
  'helpers',
  'hooks',
  'tests',
  '__tests__',
  'test',
  'spec',
  'styles',
  'public',
  'assets',
  'docs',
  'documentation',
];

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
  operation: 'read' | 'write' | 'list' | 'delete',
  path: string
): PermissionCheck {
  const config = loadConfig();
  const mode = config.permissions.mode;

  // Check path first
  const pathCheck = isPathAllowed(path);
  if (!pathCheck.allowed) {
    return pathCheck;
  }

  // In 'safe' mode, only allow read and list operations
  if (mode === 'safe' && (operation === 'write' || operation === 'delete')) {
    logger.warn(`${operation} operation blocked in 'safe' mode: ${path}`);
    return {
      allowed: false,
      reason: `${operation} operations are not allowed in 'safe' mode. Change to 'balanced' or 'unrestricted' mode.`,
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

/**
 * Check if a file is critical and requires confirmation
 */
export function isCriticalFile(path: string): boolean {
  const fileName = basename(path);
  return CRITICAL_FILES.includes(fileName);
}

/**
 * Check if a path is in a critical directory
 */
export function isInCriticalDirectory(path: string): boolean {
  const absolutePath = resolve(path);
  const pathParts = absolutePath.split('/');

  return CRITICAL_DIRS.some(criticalDir => pathParts.includes(criticalDir));
}

/**
 * Check if a path is in a safe directory
 */
export function isInSafeDirectory(path: string): boolean {
  const absolutePath = resolve(path);
  const pathParts = absolutePath.split('/');

  return SAFE_DIRS.some(safeDir => pathParts.includes(safeDir));
}

/**
 * Determine if a file operation requires user confirmation based on permission mode and file type
 */
export function requiresConfirmation(
  operation: 'read' | 'write' | 'list' | 'delete',
  path: string
): PermissionCheck {
  const config = loadConfig();
  const mode = config.permissions.mode;

  // Unrestricted mode never requires confirmation
  if (mode === 'unrestricted') {
    return {
      allowed: true,
      requiresConfirmation: false,
      fileType: 'safe',
    };
  }

  // Safe mode blocks all writes/deletes (already handled by checkFileOperation)
  if (mode === 'safe') {
    return {
      allowed: false,
      requiresConfirmation: false,
      fileType: 'safe',
    };
  }

  // Balanced mode: Smart confirmation logic
  if (mode === 'balanced') {
    // Read and list operations don't need confirmation
    if (operation === 'read' || operation === 'list') {
      return {
        allowed: true,
        requiresConfirmation: false,
        fileType: 'safe',
      };
    }

    // Check if file is critical
    if (isCriticalFile(path)) {
      logger.info(`Critical file detected: ${path} - requires confirmation`);
      return {
        allowed: true,
        requiresConfirmation: true,
        fileType: 'critical',
        reason: 'This is a critical file that requires user confirmation',
      };
    }

    // Check if in critical directory
    if (isInCriticalDirectory(path)) {
      logger.info(`File in critical directory: ${path} - requires confirmation`);
      return {
        allowed: true,
        requiresConfirmation: true,
        fileType: 'critical',
        reason: 'This file is in a critical directory',
      };
    }

    // Check if delete operation
    if (operation === 'delete') {
      logger.info(`Delete operation: ${path} - requires confirmation`);
      return {
        allowed: true,
        requiresConfirmation: true,
        fileType: 'destructive',
        reason: 'Delete operations require confirmation',
      };
    }

    // Check if in safe directory - auto-approve writes
    if (isInSafeDirectory(path)) {
      logger.info(`File in safe directory: ${path} - auto-approved`);
      return {
        allowed: true,
        requiresConfirmation: false,
        fileType: 'safe',
      };
    }

    // Default for balanced mode: require confirmation for writes in unknown locations
    logger.info(`Unknown location: ${path} - requires confirmation`);
    return {
      allowed: true,
      requiresConfirmation: true,
      fileType: 'critical',
      reason: 'File location requires review',
    };
  }

  // Default: allow but require confirmation
  return {
    allowed: true,
    requiresConfirmation: true,
    fileType: 'critical',
  };
}

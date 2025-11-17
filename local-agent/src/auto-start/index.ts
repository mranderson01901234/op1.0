import { platform } from 'os';
import * as windows from './windows';
import * as linux from './linux';
import * as logger from '../logger';

/**
 * Enable auto-start for the current platform
 */
export function enableAutoStart(executablePath: string): void {
  const platformType = platform();

  logger.info(`Enabling auto-start for platform: ${platformType}`);

  switch (platformType) {
    case 'win32':
      windows.enableAutoStart(executablePath);
      break;

    case 'linux':
      linux.enableAutoStart(executablePath);
      break;

    case 'darwin':
      // macOS support can be added later with launchd
      throw new Error('Auto-start on macOS is not yet supported');

    default:
      throw new Error(`Auto-start is not supported on platform: ${platformType}`);
  }
}

/**
 * Disable auto-start for the current platform
 */
export function disableAutoStart(): void {
  const platformType = platform();

  logger.info(`Disabling auto-start for platform: ${platformType}`);

  switch (platformType) {
    case 'win32':
      windows.disableAutoStart();
      break;

    case 'linux':
      linux.disableAutoStart();
      break;

    case 'darwin':
      throw new Error('Auto-start on macOS is not yet supported');

    default:
      throw new Error(`Auto-start is not supported on platform: ${platformType}`);
  }
}

/**
 * Check if auto-start is enabled for the current platform
 */
export function isAutoStartEnabled(): boolean {
  const platformType = platform();

  switch (platformType) {
    case 'win32':
      return windows.isAutoStartEnabled();

    case 'linux':
      return linux.isAutoStartEnabled();

    case 'darwin':
      return false;

    default:
      return false;
  }
}

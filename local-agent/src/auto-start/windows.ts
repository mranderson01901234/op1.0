import { execSync } from 'child_process';
import { resolve } from 'path';
import * as logger from '../logger';

/**
 * Windows registry path for startup applications
 */
const STARTUP_REG_PATH = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const APP_NAME = 'OperaStudioAgent';

/**
 * Enable auto-start on Windows using Registry
 */
export function enableAutoStart(executablePath: string): void {
  try {
    const absolutePath = resolve(executablePath);

    logger.info('Enabling auto-start on Windows', { path: absolutePath });

    // Add registry entry for startup
    const command = `reg add "${STARTUP_REG_PATH}" /v "${APP_NAME}" /t REG_SZ /d "\\"${absolutePath}\\"" /f`;

    execSync(command, { encoding: 'utf-8' });

    logger.info('Auto-start enabled successfully on Windows');
  } catch (error: any) {
    logger.error('Failed to enable auto-start on Windows', error);
    throw new Error(`Failed to enable auto-start: ${error.message}`);
  }
}

/**
 * Disable auto-start on Windows
 */
export function disableAutoStart(): void {
  try {
    logger.info('Disabling auto-start on Windows');

    const command = `reg delete "${STARTUP_REG_PATH}" /v "${APP_NAME}" /f`;

    execSync(command, { encoding: 'utf-8' });

    logger.info('Auto-start disabled successfully on Windows');
  } catch (error: any) {
    // If key doesn't exist, that's fine
    if (error.message.includes('unable to find')) {
      logger.info('Auto-start was not enabled');
      return;
    }

    logger.error('Failed to disable auto-start on Windows', error);
    throw new Error(`Failed to disable auto-start: ${error.message}`);
  }
}

/**
 * Check if auto-start is enabled on Windows
 */
export function isAutoStartEnabled(): boolean {
  try {
    const command = `reg query "${STARTUP_REG_PATH}" /v "${APP_NAME}"`;

    execSync(command, { encoding: 'utf-8' });

    return true;
  } catch (error) {
    // If query fails, key doesn't exist
    return false;
  }
}

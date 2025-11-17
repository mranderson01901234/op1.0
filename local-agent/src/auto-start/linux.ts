import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { resolve } from 'path';
import * as logger from '../logger';

/**
 * Linux systemd user service path
 */
const AUTOSTART_DIR = join(homedir(), '.config', 'autostart');
const DESKTOP_FILE = join(AUTOSTART_DIR, 'operastudio-agent.desktop');

/**
 * Enable auto-start on Linux using systemd user service
 */
export function enableAutoStart(executablePath: string): void {
  try {
    const absolutePath = resolve(executablePath);

    logger.info('Enabling auto-start on Linux', { path: absolutePath });

    // Create autostart directory if it doesn't exist
    if (!existsSync(AUTOSTART_DIR)) {
      require('fs').mkdirSync(AUTOSTART_DIR, { recursive: true });
    }

    // Create desktop entry file
    const desktopEntry = `[Desktop Entry]
Type=Application
Name=OperaStudio Agent
Comment=OperaStudio Local Environment Assistant
Exec=${absolutePath}
Terminal=false
StartupNotify=false
X-GNOME-Autostart-enabled=true
`;

    writeFileSync(DESKTOP_FILE, desktopEntry, 'utf-8');

    logger.info('Auto-start enabled successfully on Linux');
  } catch (error: any) {
    logger.error('Failed to enable auto-start on Linux', error);
    throw new Error(`Failed to enable auto-start: ${error.message}`);
  }
}

/**
 * Disable auto-start on Linux
 */
export function disableAutoStart(): void {
  try {
    logger.info('Disabling auto-start on Linux');

    if (existsSync(DESKTOP_FILE)) {
      unlinkSync(DESKTOP_FILE);
      logger.info('Auto-start disabled successfully on Linux');
    } else {
      logger.info('Auto-start was not enabled');
    }
  } catch (error: any) {
    logger.error('Failed to disable auto-start on Linux', error);
    throw new Error(`Failed to disable auto-start: ${error.message}`);
  }
}

/**
 * Check if auto-start is enabled on Linux
 */
export function isAutoStartEnabled(): boolean {
  return existsSync(DESKTOP_FILE);
}

import { appendFileSync, existsSync, statSync, renameSync } from 'fs';
import { join } from 'path';
import { getConfigDir } from './config';

const LOG_FILE = join(getConfigDir(), 'agent.log');
const MAX_LOG_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_LOG_FILES = 7; // Keep 7 days

export type LogLevel = 'info' | 'warn' | 'error';

/**
 * Rotate log file if it's too large
 */
function rotateLogIfNeeded(): void {
  if (!existsSync(LOG_FILE)) {
    return;
  }

  const stats = statSync(LOG_FILE);

  if (stats.size > MAX_LOG_SIZE) {
    // Rotate logs: agent.log → agent.log.1 → agent.log.2 → ... → agent.log.7
    for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
      const oldFile = `${LOG_FILE}.${i}`;
      const newFile = `${LOG_FILE}.${i + 1}`;

      if (existsSync(oldFile)) {
        if (i === MAX_LOG_FILES - 1) {
          // Delete oldest log
          try {
            require('fs').unlinkSync(oldFile);
          } catch (e) {
            // Ignore errors
          }
        } else {
          renameSync(oldFile, newFile);
        }
      }
    }

    // Rotate current log
    renameSync(LOG_FILE, `${LOG_FILE}.1`);
  }
}

/**
 * Write log entry to file
 */
function writeLog(level: LogLevel, message: string, meta?: any): void {
  try {
    rotateLogIfNeeded();

    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    const logLine = `[${level.toUpperCase()}] ${timestamp} ${message}${metaStr}\n`;

    appendFileSync(LOG_FILE, logLine, 'utf-8');
  } catch (error) {
    // If logging fails, output to console instead
    console.error('Failed to write log:', error);
  }
}

/**
 * Log info message
 */
export function info(message: string, meta?: any): void {
  writeLog('info', message, meta);
  console.log(`ℹ️  ${message}`, meta || '');
}

/**
 * Log warning message
 */
export function warn(message: string, meta?: any): void {
  writeLog('warn', message, meta);
  console.warn(`⚠️  ${message}`, meta || '');
}

/**
 * Log error message
 */
export function error(message: string, err?: Error | any): void {
  const meta = err instanceof Error
    ? { message: err.message, stack: err.stack }
    : err;

  writeLog('error', message, meta);
  console.error(`❌ ${message}`, err || '');
}

/**
 * Get log file path
 */
export function getLogPath(): string {
  return LOG_FILE;
}

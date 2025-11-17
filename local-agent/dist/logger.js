"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.info = info;
exports.warn = warn;
exports.error = error;
exports.getLogPath = getLogPath;
const fs_1 = require("fs");
const path_1 = require("path");
const config_1 = require("./config");
const LOG_FILE = (0, path_1.join)((0, config_1.getConfigDir)(), 'agent.log');
const MAX_LOG_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_LOG_FILES = 7; // Keep 7 days
/**
 * Rotate log file if it's too large
 */
function rotateLogIfNeeded() {
    if (!(0, fs_1.existsSync)(LOG_FILE)) {
        return;
    }
    const stats = (0, fs_1.statSync)(LOG_FILE);
    if (stats.size > MAX_LOG_SIZE) {
        // Rotate logs: agent.log → agent.log.1 → agent.log.2 → ... → agent.log.7
        for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
            const oldFile = `${LOG_FILE}.${i}`;
            const newFile = `${LOG_FILE}.${i + 1}`;
            if ((0, fs_1.existsSync)(oldFile)) {
                if (i === MAX_LOG_FILES - 1) {
                    // Delete oldest log
                    try {
                        require('fs').unlinkSync(oldFile);
                    }
                    catch (e) {
                        // Ignore errors
                    }
                }
                else {
                    (0, fs_1.renameSync)(oldFile, newFile);
                }
            }
        }
        // Rotate current log
        (0, fs_1.renameSync)(LOG_FILE, `${LOG_FILE}.1`);
    }
}
/**
 * Write log entry to file
 */
function writeLog(level, message, meta) {
    try {
        rotateLogIfNeeded();
        const timestamp = new Date().toISOString();
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        const logLine = `[${level.toUpperCase()}] ${timestamp} ${message}${metaStr}\n`;
        (0, fs_1.appendFileSync)(LOG_FILE, logLine, 'utf-8');
    }
    catch (error) {
        // If logging fails, output to console instead
        console.error('Failed to write log:', error);
    }
}
/**
 * Log info message
 */
function info(message, meta) {
    writeLog('info', message, meta);
    console.log(`ℹ️  ${message}`, meta || '');
}
/**
 * Log warning message
 */
function warn(message, meta) {
    writeLog('warn', message, meta);
    console.warn(`⚠️  ${message}`, meta || '');
}
/**
 * Log error message
 */
function error(message, err) {
    const meta = err instanceof Error
        ? { message: err.message, stack: err.stack }
        : err;
    writeLog('error', message, meta);
    console.error(`❌ ${message}`, err || '');
}
/**
 * Get log file path
 */
function getLogPath() {
    return LOG_FILE;
}

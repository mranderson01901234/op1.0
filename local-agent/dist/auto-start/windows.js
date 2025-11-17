"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.enableAutoStart = enableAutoStart;
exports.disableAutoStart = disableAutoStart;
exports.isAutoStartEnabled = isAutoStartEnabled;
const child_process_1 = require("child_process");
const path_1 = require("path");
const logger = __importStar(require("../logger"));
/**
 * Windows registry path for startup applications
 */
const STARTUP_REG_PATH = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const APP_NAME = 'OperaStudioAgent';
/**
 * Enable auto-start on Windows using Registry
 */
function enableAutoStart(executablePath) {
    try {
        const absolutePath = (0, path_1.resolve)(executablePath);
        logger.info('Enabling auto-start on Windows', { path: absolutePath });
        // Add registry entry for startup
        const command = `reg add "${STARTUP_REG_PATH}" /v "${APP_NAME}" /t REG_SZ /d "\\"${absolutePath}\\"" /f`;
        (0, child_process_1.execSync)(command, { encoding: 'utf-8' });
        logger.info('Auto-start enabled successfully on Windows');
    }
    catch (error) {
        logger.error('Failed to enable auto-start on Windows', error);
        throw new Error(`Failed to enable auto-start: ${error.message}`);
    }
}
/**
 * Disable auto-start on Windows
 */
function disableAutoStart() {
    try {
        logger.info('Disabling auto-start on Windows');
        const command = `reg delete "${STARTUP_REG_PATH}" /v "${APP_NAME}" /f`;
        (0, child_process_1.execSync)(command, { encoding: 'utf-8' });
        logger.info('Auto-start disabled successfully on Windows');
    }
    catch (error) {
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
function isAutoStartEnabled() {
    try {
        const command = `reg query "${STARTUP_REG_PATH}" /v "${APP_NAME}"`;
        (0, child_process_1.execSync)(command, { encoding: 'utf-8' });
        return true;
    }
    catch (error) {
        // If query fails, key doesn't exist
        return false;
    }
}

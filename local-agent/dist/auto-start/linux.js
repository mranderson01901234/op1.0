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
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
const path_2 = require("path");
const logger = __importStar(require("../logger"));
/**
 * Linux systemd user service path
 */
const AUTOSTART_DIR = (0, path_1.join)((0, os_1.homedir)(), '.config', 'autostart');
const DESKTOP_FILE = (0, path_1.join)(AUTOSTART_DIR, 'operastudio-agent.desktop');
/**
 * Enable auto-start on Linux using systemd user service
 */
function enableAutoStart(executablePath) {
    try {
        const absolutePath = (0, path_2.resolve)(executablePath);
        logger.info('Enabling auto-start on Linux', { path: absolutePath });
        // Create autostart directory if it doesn't exist
        if (!(0, fs_1.existsSync)(AUTOSTART_DIR)) {
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
        (0, fs_1.writeFileSync)(DESKTOP_FILE, desktopEntry, 'utf-8');
        logger.info('Auto-start enabled successfully on Linux');
    }
    catch (error) {
        logger.error('Failed to enable auto-start on Linux', error);
        throw new Error(`Failed to enable auto-start: ${error.message}`);
    }
}
/**
 * Disable auto-start on Linux
 */
function disableAutoStart() {
    try {
        logger.info('Disabling auto-start on Linux');
        if ((0, fs_1.existsSync)(DESKTOP_FILE)) {
            (0, fs_1.unlinkSync)(DESKTOP_FILE);
            logger.info('Auto-start disabled successfully on Linux');
        }
        else {
            logger.info('Auto-start was not enabled');
        }
    }
    catch (error) {
        logger.error('Failed to disable auto-start on Linux', error);
        throw new Error(`Failed to disable auto-start: ${error.message}`);
    }
}
/**
 * Check if auto-start is enabled on Linux
 */
function isAutoStartEnabled() {
    return (0, fs_1.existsSync)(DESKTOP_FILE);
}

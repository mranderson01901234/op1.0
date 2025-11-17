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
exports.isPathAllowed = isPathAllowed;
exports.isCommandAllowed = isCommandAllowed;
exports.checkFileOperation = checkFileOperation;
exports.getPermissionMode = getPermissionMode;
exports.getAllowedDirectories = getAllowedDirectories;
const path_1 = require("path");
const os_1 = require("os");
const config_1 = require("../config");
const logger = __importStar(require("../logger"));
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
function isPathAllowed(path) {
    const config = (0, config_1.loadConfig)();
    const allowedDirs = config.permissions.allowedDirectories;
    // Unrestricted mode allows all paths
    if (config.permissions.mode === 'unrestricted') {
        return { allowed: true };
    }
    // Resolve absolute path
    const absolutePath = (0, path_1.resolve)(path);
    // Check if path is within any allowed directory
    for (const allowedDir of allowedDirs) {
        const allowedAbsolute = (0, path_1.resolve)(allowedDir);
        const relativePath = (0, path_1.relative)(allowedAbsolute, absolutePath);
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
function isCommandAllowed(command) {
    const config = (0, config_1.loadConfig)();
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
        if (commandLower === restricted ||
            commandLower.startsWith(`${restricted} `) ||
            commandLower.includes(`|${restricted} `) ||
            commandLower.includes(`&&${restricted} `) ||
            commandLower.includes(`;${restricted} `)) {
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
function checkFileOperation(operation, path) {
    const config = (0, config_1.loadConfig)();
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
function getPermissionMode() {
    try {
        const config = (0, config_1.loadConfig)();
        return config.permissions.mode;
    }
    catch (error) {
        logger.error('Failed to load permission mode, defaulting to safe', error);
        return 'safe';
    }
}
/**
 * Get allowed directories
 */
function getAllowedDirectories() {
    try {
        const config = (0, config_1.loadConfig)();
        return config.permissions.allowedDirectories;
    }
    catch (error) {
        logger.error('Failed to load allowed directories, defaulting to home', error);
        return [(0, os_1.homedir)()];
    }
}

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
const os_1 = require("os");
const windows = __importStar(require("./windows"));
const linux = __importStar(require("./linux"));
const logger = __importStar(require("../logger"));
/**
 * Enable auto-start for the current platform
 */
function enableAutoStart(executablePath) {
    const platformType = (0, os_1.platform)();
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
function disableAutoStart() {
    const platformType = (0, os_1.platform)();
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
function isAutoStartEnabled() {
    const platformType = (0, os_1.platform)();
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

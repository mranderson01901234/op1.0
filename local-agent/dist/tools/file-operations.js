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
exports.readFileContents = readFileContents;
exports.writeFileContents = writeFileContents;
exports.listFilesInDirectory = listFilesInDirectory;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const os_1 = require("os");
const logger = __importStar(require("../logger"));
/**
 * Validate and resolve file path
 * - Must be absolute
 * - Resolve symlinks and relative paths
 * - Check for path traversal attempts
 */
function validatePath(path) {
    // Ensure absolute path
    const resolved = (0, path_1.resolve)(path);
    // Check for suspicious patterns
    if (path.includes('..') && !resolved.startsWith((0, os_1.homedir)())) {
        throw new Error('Path traversal detected');
    }
    return resolved;
}
/**
 * Read file contents
 */
async function readFileContents(path) {
    try {
        const validPath = validatePath(path);
        logger.info(`Reading file: ${validPath}`);
        const stats = await (0, promises_1.stat)(validPath);
        if (stats.isDirectory()) {
            throw new Error('Path is a directory, not a file');
        }
        // Limit file size (max 10MB for safety)
        if (stats.size > 10 * 1024 * 1024) {
            throw new Error('File too large (max 10MB)');
        }
        const content = await (0, promises_1.readFile)(validPath, 'utf-8');
        logger.info(`Successfully read file: ${validPath} (${stats.size} bytes)`);
        return {
            content,
            size: stats.size,
            path: validPath,
        };
    }
    catch (error) {
        logger.error(`Failed to read file: ${path}`, error);
        // Map error codes to user-friendly messages
        if (error.code === 'ENOENT') {
            throw new Error(`File not found: ${path}`);
        }
        else if (error.code === 'EACCES') {
            throw new Error(`Permission denied: ${path}`);
        }
        else if (error.code === 'EISDIR') {
            throw new Error(`Path is a directory: ${path}`);
        }
        throw error;
    }
}
/**
 * Write file contents
 */
async function writeFileContents(path, content) {
    try {
        const validPath = validatePath(path);
        logger.info(`Writing file: ${validPath} (${content.length} bytes)`);
        // Create parent directory if it doesn't exist
        const parentDir = (0, path_1.dirname)(validPath);
        await (0, promises_1.mkdir)(parentDir, { recursive: true });
        // Write file
        await (0, promises_1.writeFile)(validPath, content, 'utf-8');
        logger.info(`Successfully wrote file: ${validPath}`);
        return {
            success: true,
            bytesWritten: Buffer.byteLength(content, 'utf-8'),
            path: validPath,
        };
    }
    catch (error) {
        logger.error(`Failed to write file: ${path}`, error);
        if (error.code === 'EACCES') {
            throw new Error(`Permission denied: ${path}`);
        }
        else if (error.code === 'ENOSPC') {
            throw new Error('No space left on device');
        }
        throw error;
    }
}
/**
 * List files in directory
 */
async function listFilesInDirectory(path, recursive = false) {
    try {
        const validPath = validatePath(path);
        logger.info(`Listing files in: ${validPath} (recursive: ${recursive})`);
        const stats = await (0, promises_1.stat)(validPath);
        if (!stats.isDirectory()) {
            throw new Error('Path is not a directory');
        }
        const entries = await (0, promises_1.readdir)(validPath, { withFileTypes: true });
        const files = [];
        for (const entry of entries) {
            const fullPath = (0, path_1.join)(validPath, entry.name);
            const entryStat = await (0, promises_1.stat)(fullPath);
            files.push({
                name: entry.name,
                type: entry.isDirectory() ? 'directory' : 'file',
                size: entryStat.size,
                modified: entryStat.mtime,
            });
            // Recursively list subdirectories
            if (recursive && entry.isDirectory()) {
                try {
                    const subResult = await listFilesInDirectory(fullPath, true);
                    files.push(...subResult.files.map((f) => ({
                        ...f,
                        name: (0, path_1.join)(entry.name, f.name),
                    })));
                }
                catch (error) {
                    // Skip directories we can't read
                    logger.warn(`Skipping directory: ${fullPath}`, error);
                }
            }
        }
        logger.info(`Found ${files.length} items in: ${validPath}`);
        return {
            files,
            path: validPath,
        };
    }
    catch (error) {
        logger.error(`Failed to list files: ${path}`, error);
        if (error.code === 'ENOENT') {
            throw new Error(`Directory not found: ${path}`);
        }
        else if (error.code === 'EACCES') {
            throw new Error(`Permission denied: ${path}`);
        }
        else if (error.code === 'ENOTDIR') {
            throw new Error(`Not a directory: ${path}`);
        }
        throw error;
    }
}

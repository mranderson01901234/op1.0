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
exports.executeTool = executeTool;
exports.getAvailableTools = getAvailableTools;
const file_operations_1 = require("./file-operations");
const command_executor_1 = require("./command-executor");
const permissions_1 = require("./permissions");
const logger = __importStar(require("../logger"));
/**
 * Execute a tool with permission checks and error handling
 */
async function executeTool(toolCall) {
    const { tool, params } = toolCall;
    logger.info(`Executing tool: ${tool}`, { params });
    try {
        switch (tool) {
            case 'read_file':
                return await executeReadFile(params);
            case 'write_file':
                return await executeWriteFile(params);
            case 'list_directory':
                return await executeListDirectory(params);
            case 'execute_command':
                return await executeCommandTool(params);
            default:
                logger.warn(`Unknown tool: ${tool}`);
                return {
                    success: false,
                    error: `Unknown tool: ${tool}`,
                };
        }
    }
    catch (error) {
        logger.error(`Tool execution failed: ${tool}`, error);
        return {
            success: false,
            error: error.message || 'Unknown error occurred',
        };
    }
}
/**
 * Read file tool
 */
async function executeReadFile(params) {
    const { path } = params;
    if (!path) {
        return { success: false, error: 'Missing required parameter: path' };
    }
    // Check permissions
    const permCheck = (0, permissions_1.checkFileOperation)('read', path);
    if (!permCheck.allowed) {
        return { success: false, error: permCheck.reason };
    }
    try {
        const result = await (0, file_operations_1.readFileContents)(path);
        return { success: true, result };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
}
/**
 * Write file tool
 */
async function executeWriteFile(params) {
    const { path, content } = params;
    if (!path || content === undefined) {
        return { success: false, error: 'Missing required parameters: path, content' };
    }
    // Check permissions
    const permCheck = (0, permissions_1.checkFileOperation)('write', path);
    if (!permCheck.allowed) {
        return { success: false, error: permCheck.reason };
    }
    try {
        const result = await (0, file_operations_1.writeFileContents)(path, content);
        return { success: true, result };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
}
/**
 * List directory tool
 */
async function executeListDirectory(params) {
    const { path, recursive = false } = params;
    if (!path) {
        return { success: false, error: 'Missing required parameter: path' };
    }
    // Check permissions
    const permCheck = (0, permissions_1.checkFileOperation)('list', path);
    if (!permCheck.allowed) {
        return { success: false, error: permCheck.reason };
    }
    try {
        const result = await (0, file_operations_1.listFilesInDirectory)(path, recursive);
        return { success: true, result };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
}
/**
 * Execute command tool
 */
async function executeCommandTool(params) {
    const { command, cwd, timeout } = params;
    if (!command) {
        return { success: false, error: 'Missing required parameter: command' };
    }
    // Check permissions
    const permCheck = (0, permissions_1.isCommandAllowed)(command);
    if (!permCheck.allowed) {
        return { success: false, error: permCheck.reason };
    }
    // If cwd is specified, check path permissions
    if (cwd) {
        const cwdCheck = (0, permissions_1.checkFileOperation)('read', cwd);
        if (!cwdCheck.allowed) {
            return { success: false, error: `Working directory not allowed: ${cwdCheck.reason}` };
        }
    }
    try {
        const result = await (0, command_executor_1.executeCommand)(command, cwd, timeout);
        return { success: true, result };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
}
/**
 * Get list of available tools
 */
function getAvailableTools() {
    return ['read_file', 'write_file', 'list_directory', 'execute_command'];
}

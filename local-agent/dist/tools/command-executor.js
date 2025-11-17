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
exports.executeCommand = executeCommand;
exports.executeCommandSimple = executeCommandSimple;
const child_process_1 = require("child_process");
const logger = __importStar(require("../logger"));
/**
 * Dangerous command patterns to block
 */
const DANGEROUS_PATTERNS = [
    /rm\s+-rf\s+\//, // rm -rf /
    /mkfs/, // Format filesystem
    /dd\s+if=/, // Low-level disk operations
    /:\(\)\{.*:\|:.*\}/, // Fork bombs
    />\s*\/dev\/sd[a-z]/, // Write to disk devices
    /chmod\s+777/, // Overly permissive permissions
    /wget.*\|\s*sh/, // Download and execute
    /curl.*\|\s*sh/, // Download and execute
    /eval\s*\(/, // Code injection
    /exec\s*\(/, // Code injection
];
/**
 * Check if command contains dangerous patterns
 */
function isDangerousCommand(command) {
    return DANGEROUS_PATTERNS.some((pattern) => pattern.test(command));
}
/**
 * Execute a shell command with timeout and security checks
 */
async function executeCommand(command, cwd, timeoutMs = 300000 // 5 minutes default
) {
    const startTime = Date.now();
    try {
        // Security check
        if (isDangerousCommand(command)) {
            logger.warn(`Blocked dangerous command: ${command}`);
            throw new Error('Command blocked for security reasons');
        }
        logger.info(`Executing command: ${command}`, { cwd });
        return await new Promise((resolve, reject) => {
            let stdout = '';
            let stderr = '';
            let killed = false;
            // Spawn process with shell
            const child = (0, child_process_1.spawn)(command, [], {
                shell: true,
                cwd: cwd || process.cwd(),
                env: process.env,
            });
            // Set timeout
            const timeout = setTimeout(() => {
                killed = true;
                child.kill('SIGTERM');
                // Force kill if still running after 5 seconds
                setTimeout(() => {
                    if (!child.killed) {
                        child.kill('SIGKILL');
                    }
                }, 5000);
            }, timeoutMs);
            // Capture stdout
            child.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            // Capture stderr
            child.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            // Handle process exit
            child.on('close', (code) => {
                clearTimeout(timeout);
                const executionTime = Date.now() - startTime;
                if (killed) {
                    logger.warn(`Command timed out after ${timeoutMs}ms: ${command}`);
                    reject(new Error(`Command timed out after ${timeoutMs / 1000} seconds`));
                    return;
                }
                const result = {
                    stdout,
                    stderr,
                    exitCode: code ?? -1,
                    executionTime,
                };
                logger.info(`Command completed in ${executionTime}ms with exit code ${code}`, {
                    command,
                    exitCode: code,
                });
                resolve(result);
            });
            // Handle process errors
            child.on('error', (error) => {
                clearTimeout(timeout);
                logger.error(`Command execution failed: ${command}`, error);
                reject(error);
            });
        });
    }
    catch (error) {
        logger.error(`Failed to execute command: ${command}`, error);
        // Map common errors
        if (error.code === 'ENOENT') {
            throw new Error('Command not found');
        }
        else if (error.code === 'EACCES') {
            throw new Error('Permission denied');
        }
        throw error;
    }
}
/**
 * Execute a command and return only stdout
 * (convenience wrapper)
 */
async function executeCommandSimple(command, cwd) {
    const result = await executeCommand(command, cwd);
    if (result.exitCode !== 0) {
        throw new Error(`Command failed with exit code ${result.exitCode}: ${result.stderr}`);
    }
    return result.stdout.trim();
}

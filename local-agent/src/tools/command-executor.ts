import { spawn } from 'child_process';
import * as logger from '../logger';

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

/**
 * Dangerous command patterns to block
 */
const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//,           // rm -rf /
  /mkfs/,                     // Format filesystem
  /dd\s+if=/,                 // Low-level disk operations
  /:\(\)\{.*:\|:.*\}/,        // Fork bombs
  />\s*\/dev\/sd[a-z]/,       // Write to disk devices
  /chmod\s+777/,              // Overly permissive permissions
  /wget.*\|\s*sh/,            // Download and execute
  /curl.*\|\s*sh/,            // Download and execute
  /eval\s*\(/,                // Code injection
  /exec\s*\(/,                // Code injection
];

/**
 * Check if command contains dangerous patterns
 */
function isDangerousCommand(command: string): boolean {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(command));
}

/**
 * Execute a shell command with timeout and security checks
 */
export async function executeCommand(
  command: string,
  cwd?: string,
  timeoutMs: number = 300000 // 5 minutes default
): Promise<CommandResult> {
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
      const child = spawn(command, [], {
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

        const result: CommandResult = {
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
  } catch (error: any) {
    logger.error(`Failed to execute command: ${command}`, error);

    // Map common errors
    if (error.code === 'ENOENT') {
      throw new Error('Command not found');
    } else if (error.code === 'EACCES') {
      throw new Error('Permission denied');
    }

    throw error;
  }
}

/**
 * Execute a command and return only stdout
 * (convenience wrapper)
 */
export async function executeCommandSimple(command: string, cwd?: string): Promise<string> {
  const result = await executeCommand(command, cwd);

  if (result.exitCode !== 0) {
    throw new Error(`Command failed with exit code ${result.exitCode}: ${result.stderr}`);
  }

  return result.stdout.trim();
}

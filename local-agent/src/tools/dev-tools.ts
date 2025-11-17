import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Run npm command
 */
export async function runNpmCommand(
  command: string,
  cwd: string,
  packageManager: string = 'npm'
): Promise<any> {
  const pm = packageManager === 'pnpm' ? 'pnpm' : 'npm';
  const fullCommand = `${pm} ${command}`;

  try {
    const { stdout, stderr } = await execAsync(fullCommand, {
      cwd,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    return {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    };
  } catch (error: any) {
    return {
      success: false,
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || error.message,
      exitCode: error.code,
    };
  }
}

/**
 * Get git status
 */
export async function getGitStatus(repoPath: string): Promise<any> {
  try {
    const { stdout } = await execAsync('git status --short', { cwd: repoPath });
    const { stdout: branch } = await execAsync('git branch --show-current', { cwd: repoPath });

    return {
      branch: branch.trim(),
      status: stdout.trim() || 'Working tree clean',
      hasChanges: stdout.trim().length > 0,
    };
  } catch (error: any) {
    throw new Error(`Failed to get git status: ${error.message}`);
  }
}

/**
 * Get git diff
 */
export async function getGitDiff(repoPath: string, staged: boolean = false): Promise<string> {
  try {
    const command = staged ? 'git diff --cached' : 'git diff';
    const { stdout } = await execAsync(command, {
      cwd: repoPath,
      maxBuffer: 10 * 1024 * 1024,
    });

    return stdout || 'No changes';
  } catch (error: any) {
    throw new Error(`Failed to get git diff: ${error.message}`);
  }
}

/**
 * Install npm package
 */
export async function installPackage(
  packageName: string,
  cwd: string,
  dev: boolean = false,
  packageManager: string = 'npm'
): Promise<any> {
  const pm = packageManager === 'pnpm' ? 'pnpm' : 'npm';
  const devFlag = dev ? (pm === 'npm' ? '--save-dev' : '-D') : '';
  const addCommand = pm === 'npm' ? 'install' : 'add';
  const command = `${pm} ${addCommand} ${packageName} ${devFlag}`.trim();

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
    });

    return {
      success: true,
      package: packageName,
      dev,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    };
  } catch (error: any) {
    return {
      success: false,
      package: packageName,
      dev,
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || error.message,
      exitCode: error.code,
    };
  }
}

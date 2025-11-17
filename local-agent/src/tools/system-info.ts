import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Get system information
 */
export async function getSystemInfo(): Promise<any> {
  return {
    platform: os.platform(),
    type: os.type(),
    arch: os.arch(),
    release: os.release(),
    hostname: os.hostname(),
    cpus: os.cpus().length,
    totalMemory: `${(os.totalmem() / (1024 ** 3)).toFixed(2)} GB`,
    freeMemory: `${(os.freemem() / (1024 ** 3)).toFixed(2)} GB`,
    uptime: `${(os.uptime() / 3600).toFixed(2)} hours`,
    homeDir: os.homedir(),
    tmpDir: os.tmpdir(),
  };
}

/**
 * Get list of running processes
 */
export async function getProcessList(filter?: string): Promise<any> {
  try {
    const platform = os.platform();
    let cmd: string;

    if (platform === 'win32') {
      cmd = 'tasklist';
    } else {
      cmd = 'ps aux';
    }

    const { stdout } = await execAsync(cmd);
    let lines = stdout.trim().split('\n');

    // Filter if provided
    if (filter) {
      lines = lines.filter(line =>
        line.toLowerCase().includes(filter.toLowerCase())
      );
    }

    // Limit to 50 processes for performance
    const processes = lines.slice(0, 50);

    return {
      count: processes.length,
      processes: processes.join('\n'),
    };
  } catch (error: any) {
    throw new Error(`Failed to get process list: ${error.message}`);
  }
}

/**
 * Get environment variables
 */
export function getEnvironmentVariables(names?: string): any {
  if (names) {
    const varNames = names.split(',').map(n => n.trim());
    const result: any = {};

    for (const name of varNames) {
      if (process.env[name]) {
        result[name] = process.env[name];
      }
    }

    return result;
  }

  // Return all env vars (excluding sensitive ones)
  const filtered: any = {};
  const sensitivePatterns = ['PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'CREDENTIAL'];

  for (const [key, value] of Object.entries(process.env)) {
    const isSensitive = sensitivePatterns.some(pattern =>
      key.toUpperCase().includes(pattern)
    );

    if (!isSensitive) {
      filtered[key] = value;
    } else {
      filtered[key] = '***REDACTED***';
    }
  }

  return filtered;
}

/**
 * Get current working directory
 */
export function getCurrentDirectory(): string {
  return process.cwd();
}

/**
 * Get CPU usage information
 */
export async function getCPUUsage(): Promise<any> {
  const cpus = os.cpus();

  // Calculate average CPU usage
  let totalIdle = 0;
  let totalTick = 0;

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  }

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - Math.floor((idle / total) * 100);

  return {
    cores: cpus.length,
    model: cpus[0].model,
    speed: `${cpus[0].speed} MHz`,
    usage: `${usage}%`,
    details: cpus.map((cpu, i) => ({
      core: i,
      model: cpu.model,
      speed: `${cpu.speed} MHz`,
    })),
  };
}

/**
 * Get disk space information
 */
export async function getDiskSpace(path?: string): Promise<any> {
  try {
    const platform = os.platform();
    const targetPath = path || (platform === 'win32' ? 'C:' : '/');

    let cmd: string;

    if (platform === 'win32') {
      cmd = `wmic logicaldisk where "DeviceID='${targetPath}'" get Size,FreeSpace,FileSystem /format:csv`;
    } else if (platform === 'darwin') {
      cmd = `df -h "${targetPath}" | tail -1 | awk '{print $2","$3","$4","$5","$1}'`;
    } else {
      // Linux
      cmd = `df -h "${targetPath}" | tail -1 | awk '{print $2","$3","$4","$5","$1}'`;
    }

    const { stdout } = await execAsync(cmd);

    if (platform === 'win32') {
      const lines = stdout.trim().split('\n');
      const data = lines[1]?.split(',');
      if (data && data.length >= 3) {
        const total = parseInt(data[2]);
        const free = parseInt(data[1]);
        const used = total - free;
        const usedPercent = Math.round((used / total) * 100);

        return {
          path: targetPath,
          total: `${(total / (1024 ** 3)).toFixed(2)} GB`,
          used: `${(used / (1024 ** 3)).toFixed(2)} GB`,
          free: `${(free / (1024 ** 3)).toFixed(2)} GB`,
          usedPercent: `${usedPercent}%`,
          filesystem: data[3] || 'NTFS',
        };
      }
    } else {
      const parts = stdout.trim().split(',');
      if (parts.length >= 5) {
        return {
          path: targetPath,
          total: parts[0],
          used: parts[1],
          free: parts[2],
          usedPercent: parts[3],
          filesystem: parts[4],
        };
      }
    }

    throw new Error('Failed to parse disk space information');
  } catch (error: any) {
    throw new Error(`Failed to get disk space: ${error.message}`);
  }
}

/**
 * Get memory usage details
 */
export function getMemoryUsage(): any {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const usedPercent = Math.round((used / total) * 100);

  return {
    total: `${(total / (1024 ** 3)).toFixed(2)} GB`,
    used: `${(used / (1024 ** 3)).toFixed(2)} GB`,
    free: `${(free / (1024 ** 3)).toFixed(2)} GB`,
    usedPercent: `${usedPercent}%`,
    totalBytes: total,
    usedBytes: used,
    freeBytes: free,
  };
}

/**
 * Get network interfaces information
 */
export function getNetworkInfo(): any {
  const interfaces = os.networkInterfaces();
  const result: any = {};

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (addrs) {
      result[name] = addrs.map(addr => ({
        address: addr.address,
        family: addr.family,
        internal: addr.internal,
        mac: addr.mac,
      }));
    }
  }

  return result;
}

/**
 * Get comprehensive system health report
 */
export async function getSystemHealth(): Promise<any> {
  try {
    const [cpuUsage, diskSpace, processListResult] = await Promise.all([
      getCPUUsage(),
      getDiskSpace().catch(() => ({ error: 'Could not retrieve disk space' })),
      getProcessList().catch(() => ({ count: 0, processes: 'Could not retrieve processes' })),
    ]);

    const memoryUsage = getMemoryUsage();
    const systemInfo = await getSystemInfo();

    // Determine health status
    const cpuUsageNum = parseInt(cpuUsage.usage);
    const memUsageNum = parseInt(memoryUsage.usedPercent);
    const diskUsageNum = typeof diskSpace.usedPercent === 'string'
      ? parseInt(diskSpace.usedPercent)
      : 0;

    let status = 'healthy';
    const warnings: string[] = [];

    if (cpuUsageNum > 80) {
      status = 'warning';
      warnings.push(`High CPU usage: ${cpuUsage.usage}`);
    }

    if (memUsageNum > 85) {
      status = 'warning';
      warnings.push(`High memory usage: ${memoryUsage.usedPercent}`);
    }

    if (diskUsageNum > 90) {
      status = 'critical';
      warnings.push(`Critical disk space: ${diskSpace.usedPercent} used`);
    } else if (diskUsageNum > 80) {
      status = status === 'critical' ? 'critical' : 'warning';
      warnings.push(`Low disk space: ${diskSpace.usedPercent} used`);
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      warnings,
      system: {
        platform: systemInfo.platform,
        hostname: systemInfo.hostname,
        uptime: systemInfo.uptime,
      },
      cpu: cpuUsage,
      memory: memoryUsage,
      disk: diskSpace,
      processes: {
        count: processListResult.count || 0,
      },
    };
  } catch (error: any) {
    throw new Error(`Failed to get system health: ${error.message}`);
  }
}

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface AgentConfig {
  userId: string;
  sharedSecret: string;
  serverUrl: string;
  version: string;
  autoStart: boolean;
  permissions: {
    mode: 'safe' | 'balanced' | 'unrestricted';
    allowedDirectories: string[];
  };
  telemetry: {
    enabled: boolean;
    anonymize: boolean;
  };
}

const CONFIG_DIR = join(homedir(), '.operastudio');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

/**
 * Get configuration directory path
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}

/**
 * Get configuration file path
 */
export function getConfigPath(): string {
  return CONFIG_FILE;
}

/**
 * Ensure config directory exists
 */
export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Load configuration from file
 */
export function loadConfig(): AgentConfig {
  ensureConfigDir();

  if (!existsSync(CONFIG_FILE)) {
    throw new Error('Configuration file not found. Please run the installer first.');
  }

  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(content);

    // Validate required fields
    if (!config.userId || !config.sharedSecret || !config.serverUrl) {
      throw new Error('Invalid configuration: missing required fields');
    }

    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid configuration file: JSON parse error');
    }
    throw error;
  }
}

/**
 * Save configuration to file
 */
export function saveConfig(config: AgentConfig): void {
  ensureConfigDir();

  try {
    const content = JSON.stringify(config, null, 2);
    writeFileSync(CONFIG_FILE, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save configuration: ${error}`);
  }
}

/**
 * Update specific config fields
 */
export function updateConfig(updates: Partial<AgentConfig>): void {
  const config = loadConfig();
  const updated = { ...config, ...updates };
  saveConfig(updated);
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): Partial<AgentConfig> {
  return {
    version: '1.0.0',
    autoStart: true,
    permissions: {
      mode: 'balanced',
      allowedDirectories: [homedir()],
    },
    telemetry: {
      enabled: true,
      anonymize: false,
    },
  };
}

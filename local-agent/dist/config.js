"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigDir = getConfigDir;
exports.getConfigPath = getConfigPath;
exports.ensureConfigDir = ensureConfigDir;
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.updateConfig = updateConfig;
exports.getDefaultConfig = getDefaultConfig;
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const CONFIG_DIR = (0, path_1.join)((0, os_1.homedir)(), '.operastudio');
const CONFIG_FILE = (0, path_1.join)(CONFIG_DIR, 'config.json');
/**
 * Get configuration directory path
 */
function getConfigDir() {
    return CONFIG_DIR;
}
/**
 * Get configuration file path
 */
function getConfigPath() {
    return CONFIG_FILE;
}
/**
 * Ensure config directory exists
 */
function ensureConfigDir() {
    if (!(0, fs_1.existsSync)(CONFIG_DIR)) {
        (0, fs_1.mkdirSync)(CONFIG_DIR, { recursive: true });
    }
}
/**
 * Load configuration from file
 */
function loadConfig() {
    ensureConfigDir();
    if (!(0, fs_1.existsSync)(CONFIG_FILE)) {
        throw new Error('Configuration file not found. Please run the installer first.');
    }
    try {
        const content = (0, fs_1.readFileSync)(CONFIG_FILE, 'utf-8');
        const config = JSON.parse(content);
        // Validate required fields
        if (!config.userId || !config.sharedSecret || !config.serverUrl) {
            throw new Error('Invalid configuration: missing required fields');
        }
        return config;
    }
    catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error('Invalid configuration file: JSON parse error');
        }
        throw error;
    }
}
/**
 * Save configuration to file
 */
function saveConfig(config) {
    ensureConfigDir();
    try {
        const content = JSON.stringify(config, null, 2);
        (0, fs_1.writeFileSync)(CONFIG_FILE, content, 'utf-8');
    }
    catch (error) {
        throw new Error(`Failed to save configuration: ${error}`);
    }
}
/**
 * Update specific config fields
 */
function updateConfig(updates) {
    const config = loadConfig();
    const updated = { ...config, ...updates };
    saveConfig(updated);
}
/**
 * Get default configuration
 */
function getDefaultConfig() {
    return {
        version: '1.0.0',
        autoStart: true,
        permissions: {
            mode: 'balanced',
            allowedDirectories: [(0, os_1.homedir)()],
        },
        telemetry: {
            enabled: true,
            anonymize: false,
        },
    };
}

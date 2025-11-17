# OperaStudio Local Agent

Production-ready TypeScript local agent that executes file operations and commands on the user's machine.

## Features

- **WebSocket Client**: Connects to cloud server with automatic reconnection and exponential backoff
- **File Operations**: Read, write, and list files with security validation
- **Command Execution**: Execute shell commands with timeout and dangerous command blocking
- **Permission System**: Three modes (Safe, Balanced, Unrestricted) with path validation
- **Auto-Start**: Automatic startup on system boot (Windows/Linux)
- **Logging**: File-based logging with automatic rotation (100MB max, 7 days retention)

## Architecture

```
src/
├── index.ts                    # Main entry point
├── config.ts                   # Configuration management
├── logger.ts                   # File logging with rotation
├── websocket-client.ts         # WebSocket connection handler
├── tools/
│   ├── index.ts                # Tool executor and router
│   ├── file-operations.ts      # Read, write, list files
│   ├── command-executor.ts     # Shell command execution
│   └── permissions.ts          # Permission checking
└── auto-start/
    ├── index.ts                # Platform-agnostic auto-start
    ├── windows.ts              # Windows Registry auto-start
    └── linux.ts                # Linux .desktop file auto-start
```

## Configuration

Configuration is stored in `~/.operastudio/config.json`:

```json
{
  "userId": "user_xxx",
  "sharedSecret": "64-character-hex-string",
  "serverUrl": "wss://ws.operastudio.com",
  "version": "1.0.0",
  "autoStart": true,
  "permissions": {
    "mode": "balanced",
    "allowedDirectories": ["/home/user"]
  },
  "telemetry": {
    "enabled": true,
    "anonymize": false
  }
}
```

## Permission Modes

### Safe Mode
- **Read-only**: Can read files and list directories
- **No writes**: Cannot write files or modify filesystem
- **Restricted commands**: Blocks most commands (rm, chmod, curl, etc.)
- **Path validation**: Only allowed directories

### Balanced Mode (Default)
- **Read/Write**: Can read and write files
- **Most commands**: Allows common commands
- **Blocks dangerous**: Still blocks format, dd, shutdown, sudo
- **Path validation**: Only allowed directories

### Unrestricted Mode
- **Full access**: All file operations
- **All commands**: No command restrictions
- **No path validation**: Access to entire filesystem
- **⚠️ Use with caution**: Only for trusted environments

## Tools

### read_file
Read file contents with security checks.

**Params:**
- `path` (string): Absolute file path

**Limits:**
- Max file size: 10MB
- Must be within allowed directories

### write_file
Write content to a file.

**Params:**
- `path` (string): Absolute file path
- `content` (string): File content

**Limits:**
- Creates parent directories if needed
- Must be within allowed directories
- Blocked in 'safe' mode

### list_directory
List files and directories.

**Params:**
- `path` (string): Directory path
- `recursive` (boolean, optional): Recursive listing

### execute_command
Execute shell command with timeout.

**Params:**
- `command` (string): Shell command
- `cwd` (string, optional): Working directory
- `timeout` (number, optional): Timeout in milliseconds (default: 5 minutes)

**Security:**
- Blocks dangerous patterns (rm -rf /, fork bombs, etc.)
- Restricted by permission mode
- 5-minute timeout
- Captures stdout, stderr, exit code

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build TypeScript
pnpm build

# Build standalone binaries
pnpm build:binaries
```

## Build Outputs

- `dist/` - Compiled JavaScript
- `dist/binaries/` - Standalone executables for Windows and Linux

## Logging

Logs are stored in `~/.operastudio/agent.log` with automatic rotation:
- Max file size: 100MB
- Retention: 7 days (agent.log.1 → agent.log.7)
- Log levels: info, warn, error

View logs:
```bash
tail -f ~/.operastudio/agent.log
```

## Security

### Path Validation
- Resolves symlinks and relative paths
- Blocks path traversal attempts
- Validates against allowed directories

### Command Sanitization
Blocks dangerous patterns:
- `rm -rf /` - Recursive delete from root
- `mkfs`, `dd` - Low-level disk operations
- `:(){ :|:& };:` - Fork bombs
- `wget ... | sh` - Download and execute
- And more...

### Permission Enforcement
- All operations check permission mode
- Path validation on every file operation
- Command allowlist based on mode

## WebSocket Protocol

### Client → Server

**Heartbeat:**
```json
{
  "type": "heartbeat",
  "timestamp": 1234567890
}
```

**Tool Response:**
```json
{
  "type": "tool_response",
  "requestId": "req_xxx",
  "success": true,
  "result": {...},
  "executionTime": 123
}
```

### Server → Client

**Connection Confirmed:**
```json
{
  "type": "connected",
  "userId": "user_xxx",
  "timestamp": 1234567890
}
```

**Heartbeat Acknowledgment:**
```json
{
  "type": "heartbeat_ack",
  "timestamp": 1234567890
}
```

**Tool Call:**
```json
{
  "type": "tool_call",
  "requestId": "req_xxx",
  "tool": "read_file",
  "params": {
    "path": "/home/user/file.txt"
  }
}
```

## Auto-Start

Enable auto-start during installation:

**Windows:**
- Registry key: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
- Entry: `OperaStudioAgent`

**Linux:**
- Desktop file: `~/.config/autostart/operastudio-agent.desktop`
- XDG autostart specification

**macOS:**
- Not yet implemented (planned: launchd)

## Error Handling

All errors are logged and returned with user-friendly messages:

- `ENOENT` → "File not found"
- `EACCES` → "Permission denied"
- `EISDIR` → "Path is a directory"
- `ENOSPC` → "No space left on device"

Timeouts and dangerous commands return specific error messages for security.

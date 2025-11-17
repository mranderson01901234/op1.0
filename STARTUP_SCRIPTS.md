# OperaStudio Startup Scripts

Quick reference for managing all OperaStudio services.

## Available Scripts

### 🚀 `./start-all.sh`
**Starts all services in the correct order**

What it does:
1. Kills all existing processes on ports 3000, 3001, 8082
2. Cleans build artifacts (.next directory)
3. Starts WebSocket server (if exists)
4. Starts Next.js web app
5. Starts Electron browser agent (if exists)
6. Shows service status and logs

Usage:
```bash
./start-all.sh
```

After starting, press Ctrl+C to stop viewing logs (services continue running).

---

### 🛑 `./stop-all.sh`
**Stops all running services**

What it does:
1. Kills processes from saved PID file
2. Frees ports 3000, 3001, 8082
3. Kills any remaining Next.js, Electron, WebSocket processes

Usage:
```bash
./stop-all.sh
```

---

### 🔄 `./restart-all.sh`
**Stops then starts all services**

Usage:
```bash
./restart-all.sh
```

Equivalent to:
```bash
./stop-all.sh
./start-all.sh
```

---

### 📊 `./status.sh`
**Check status of all services**

Shows:
- Which services are running (with PIDs)
- Which ports are in use
- Recent log entries
- Available commands

Usage:
```bash
./status.sh
```

---

## Service Details

### Services Started

| Service | Port | Location | Logs |
|---------|------|----------|------|
| **Next.js Web App** | 3000/3001 | `./ (root)` | `logs/nextjs.log` |
| **WebSocket Server** | 8082 | `./websocket-server` | `logs/websocket.log` |
| **Electron Browser** | N/A (system tray) | `./electron-browser` | `logs/electron.log` |

### Log Files

All logs are saved to the `logs/` directory:

```bash
# View Next.js logs in real-time
tail -f logs/nextjs.log

# View WebSocket logs
tail -f logs/websocket.log

# View Electron browser logs
tail -f logs/electron.log

# View all logs together
tail -f logs/*.log
```

---

## Quick Start Workflow

### First Time Setup

```bash
# Make scripts executable (already done)
chmod +x start-all.sh stop-all.sh restart-all.sh status.sh

# Start everything
./start-all.sh
```

### Daily Development

```bash
# Morning: Start all services
./start-all.sh

# During day: Check status
./status.sh

# After changes: Restart
./restart-all.sh

# Evening: Stop all
./stop-all.sh
```

---

## Troubleshooting

### Port Already in Use

```bash
# Stop all services first
./stop-all.sh

# If still having issues, manually kill:
sudo lsof -ti:3000 | xargs kill -9
sudo lsof -ti:8082 | xargs kill -9
```

### Service Won't Start

```bash
# Check the logs
tail -50 logs/nextjs.log
tail -50 logs/websocket.log
tail -50 logs/electron.log

# Clean everything and restart
rm -rf .next logs
./start-all.sh
```

### Electron Browser Not Starting

```bash
# Check if Electron dependencies are installed
cd electron-browser
npm install
cd ..

# Restart all
./restart-all.sh
```

---

## Manual Service Control

If you need to start services individually:

```bash
# WebSocket Server only
cd websocket-server && pnpm dev

# Next.js only
pnpm dev

# Electron Browser only
cd electron-browser && npm run dev
```

---

## Environment Variables

The scripts use these defaults:

| Variable | Default | Override |
|----------|---------|----------|
| WebSocket URL | `ws://localhost:8082` | Set `WS_URL` in `electron-browser/src/main.js` |
| User ID | `demo-user` | Set `USER_ID` in `electron-browser/src/main.js` |
| Next.js Port | `3000` (or `3001`) | Auto-detected |

---

## File Locations

```
op1.0/
├── start-all.sh         # Start all services
├── stop-all.sh          # Stop all services
├── restart-all.sh       # Restart all services
├── status.sh            # Check service status
├── logs/                # Service logs
│   ├── nextjs.log
│   ├── websocket.log
│   └── electron.log
├── .pids                # Process IDs (auto-generated)
└── websocket-server/    # WebSocket service
    └── ...
└── electron-browser/    # Browser agent
    └── ...
```

---

## Best Practices

1. **Always use `stop-all.sh` before manually starting services**
   - Prevents port conflicts
   - Ensures clean state

2. **Check `status.sh` if something isn't working**
   - Shows which services are running
   - Points you to relevant logs

3. **Use `restart-all.sh` after code changes**
   - Ensures all processes pick up changes
   - Cleans build artifacts

4. **Monitor logs when debugging**
   ```bash
   tail -f logs/nextjs.log
   ```

---

## Quick Reference

```bash
# Start everything
./start-all.sh

# Check what's running
./status.sh

# Stop everything
./stop-all.sh

# Restart everything
./restart-all.sh

# View logs
tail -f logs/nextjs.log
tail -f logs/websocket.log
tail -f logs/electron.log
```

---

That's it! You now have complete control over all OperaStudio services with simple commands.

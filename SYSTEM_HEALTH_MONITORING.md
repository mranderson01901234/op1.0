# System Health Monitoring

OperaStudio AI now includes comprehensive **system health monitoring** capabilities - allowing the AI to autonomously check your system's health status and provide detailed reports.

## Available Health Monitoring Tools

### 1. `get_system_health` - Comprehensive Health Report

Get a complete health status report with intelligent warnings.

**What it checks:**
- CPU usage percentage
- Memory usage percentage
- Disk space usage
- Running processes count
- Health status (healthy/warning/critical)

**Health Thresholds:**
- ✅ **Healthy** - CPU < 80%, Memory < 85%, Disk < 80%
- ⚠️ **Warning** - CPU > 80%, Memory > 85%, or Disk > 80%
- 🔴 **Critical** - Disk > 90%

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-17T06:00:00.000Z",
  "warnings": [],
  "system": {
    "platform": "linux",
    "hostname": "dev-machine",
    "uptime": "48.50 hours"
  },
  "cpu": {
    "cores": 8,
    "model": "Intel Core i7",
    "speed": "2400 MHz",
    "usage": "35%"
  },
  "memory": {
    "total": "29.25 GB",
    "used": "21.50 GB",
    "free": "7.75 GB",
    "usedPercent": "73%"
  },
  "disk": {
    "path": "/",
    "total": "500 GB",
    "used": "350 GB",
    "free": "150 GB",
    "usedPercent": "70%"
  },
  "processes": {
    "count": 245
  }
}
```

---

### 2. `get_cpu_usage` - CPU Information

Get detailed CPU usage and specifications.

**Returns:**
- Number of CPU cores
- CPU model name
- CPU speed (MHz)
- Current CPU usage percentage
- Per-core details

**Example Response:**
```json
{
  "cores": 8,
  "model": "Intel(R) Core(TM) i7-9700K CPU @ 3.60GHz",
  "speed": "2400 MHz",
  "usage": "35%",
  "details": [
    { "core": 0, "model": "Intel Core i7", "speed": "2400 MHz" },
    { "core": 1, "model": "Intel Core i7", "speed": "2400 MHz" }
  ]
}
```

---

### 3. `get_memory_usage` - Memory Statistics

Get detailed memory usage information.

**Returns:**
- Total RAM
- Used memory
- Free memory
- Usage percentage
- Raw byte values

**Example Response:**
```json
{
  "total": "29.25 GB",
  "used": "21.50 GB",
  "free": "7.75 GB",
  "usedPercent": "73%",
  "totalBytes": 31402655744,
  "usedBytes": 23090757632,
  "freeBytes": 8311898112
}
```

---

### 4. `get_disk_space` - Disk Space Information

Get disk space usage for a specific path or root filesystem.

**Parameters:**
- `path` (optional) - Path to check (defaults to root filesystem)

**Returns:**
- Total disk space
- Used space
- Free space
- Usage percentage
- Filesystem type

**Example Response:**
```json
{
  "path": "/",
  "total": "500G",
  "used": "350G",
  "free": "150G",
  "usedPercent": "70%",
  "filesystem": "/dev/sda1"
}
```

**Cross-Platform Support:**
- ✅ Linux
- ✅ macOS
- ✅ Windows

---

### 5. `get_network_info` - Network Interfaces

Get information about all network interfaces.

**Returns:**
- Interface names
- IP addresses (IPv4 and IPv6)
- MAC addresses
- Internal/external status

**Example Response:**
```json
{
  "eth0": [
    {
      "address": "192.168.1.100",
      "family": "IPv4",
      "internal": false,
      "mac": "00:1a:2b:3c:4d:5e"
    }
  ],
  "lo": [
    {
      "address": "127.0.0.1",
      "family": "IPv4",
      "internal": true,
      "mac": "00:00:00:00:00:00"
    }
  ]
}
```

---

## Usage Examples

### Example 1: Simple Health Check

**User:** "What's my system health?"

**AI Workflow:**
1. **Reason:** User wants overall system health status
2. **Act:** Call `get_system_health`
3. **Observe:** Analyze the results
4. **Complete:** Present findings with any warnings

**Expected Output:**
```
Your system is currently **healthy** ✅

**System Overview:**
- Platform: Linux
- Hostname: dev-machine
- Uptime: 48.50 hours

**Resource Usage:**
- CPU: 35% (8 cores)
- Memory: 73% used (21.50 GB / 29.25 GB)
- Disk: 70% used (350 GB / 500 GB)

**Status:** All metrics are within normal ranges. No warnings.
```

---

### Example 2: Investigating Performance Issues

**User:** "My computer is running slow, can you check what's wrong?"

**AI Workflow:**
1. **Reason:** Need to diagnose performance issues
2. **Act:** Call `get_system_health` for overview
3. **Observe:** High memory usage detected (92%)
4. **Act:** Call `get_process_list` to identify heavy processes
5. **Observe:** Find resource-intensive processes
6. **Act:** Suggest solutions
7. **Complete:** Provide detailed analysis and recommendations

---

### Example 3: Checking Available Disk Space

**User:** "Do I have enough disk space to install a 50GB application?"

**AI Workflow:**
1. **Reason:** Need to check available disk space
2. **Act:** Call `get_disk_space`
3. **Observe:** Free space is 150 GB
4. **Complete:** Confirm sufficient space (150 GB > 50 GB)

---

### Example 4: Monitoring System Before Large Operation

**User:** "I'm about to build a large project, should I check my system first?"

**AI Workflow:**
1. **Reason:** Good practice to check system health before intensive operations
2. **Act:** Call `get_system_health`
3. **Observe:** Memory at 85% (warning threshold)
4. **Act:** Call `get_memory_usage` for detailed analysis
5. **Complete:** Suggest clearing some memory before proceeding

---

## Intelligent Health Warnings

The `get_system_health` tool provides intelligent warnings:

### Warning Examples:

```json
{
  "status": "warning",
  "warnings": [
    "High CPU usage: 85%",
    "High memory usage: 90%"
  ]
}
```

```json
{
  "status": "critical",
  "warnings": [
    "Critical disk space: 95% used"
  ]
}
```

---

## Integration with Agentic Workflows

These health monitoring tools integrate seamlessly with OperaStudio's agentic capabilities:

**Multi-Step Health Analysis:**
```
User: "Analyze my system performance"

AI Process:
1. get_system_health → Overall status
2. get_cpu_usage → Detailed CPU metrics
3. get_memory_usage → Detailed memory metrics
4. get_process_list → Identify resource hogs
5. Compile comprehensive report
```

---

## Use Cases

### Development Workflow
- Check system resources before starting builds
- Monitor performance during development
- Diagnose slow compilation times

### System Administration
- Quick health checks
- Capacity planning
- Resource monitoring

### Troubleshooting
- Identify resource bottlenecks
- Diagnose performance issues
- Track resource usage trends

---

## Technical Details

### Implementation
- **Location:** `local-agent/src/tools/system-info.ts`
- **Execution:** All tools run on the local agent with permission checks
- **Performance:** Lightweight operations, sub-second response times
- **Cross-Platform:** Works on Linux, macOS, and Windows

### Tools Count
**Total System Health Tools:** 5
- `get_system_health` (comprehensive)
- `get_cpu_usage`
- `get_memory_usage`
- `get_disk_space`
- `get_network_info`

**Overall Tool Count:** 27 tools (22 existing + 5 health monitoring)

---

## Permission Requirements

All health monitoring tools are **read-only** operations and work in all permission modes:
- ✅ Safe mode
- ✅ Balanced mode
- ✅ Unrestricted mode

No special permissions or elevated access required.

---

## Sample Queries

Try these with your OperaStudio AI:

```
"What's my system health?"
"Check my CPU and memory usage"
"How much disk space do I have left?"
"Is my computer running normally?"
"Show me my network interfaces"
"Analyze my system performance"
"Do I have enough resources to compile my project?"
"What's using the most memory on my system?"
```

---

## Future Enhancements

Potential additions:
- **Historical tracking** - Track metrics over time
- **Alerts** - Proactive notifications when thresholds are exceeded
- **GPU monitoring** - Graphics card usage and temperature
- **Network speed tests** - Bandwidth and latency checks
- **Process management** - Kill/restart resource-heavy processes
- **Custom thresholds** - User-configurable warning levels

---

## Summary

OperaStudio AI can now:
- ✅ **Monitor system health** with intelligent status reporting
- ✅ **Check CPU usage** with detailed core information
- ✅ **Track memory usage** with percentage and raw values
- ✅ **Measure disk space** on any path or filesystem
- ✅ **List network interfaces** with IP and MAC addresses
- ✅ **Provide warnings** when resources are running low
- ✅ **Work cross-platform** (Linux, macOS, Windows)

All integrated into the **agentic workflow** system for autonomous multi-step analysis!

# Agentic Workflows & ReAct Pattern

OperaStudio AI now supports **agentic workflows** - the ability to autonomously plan and execute multi-step processes using tool calling and the ReAct (Reasoning and Acting) pattern.

## What is Agentic AI?

Agentic AI refers to AI systems that can:
- **Plan** complex multi-step tasks autonomously
- **Execute** actions using available tools
- **Observe** results and adapt accordingly
- **Iterate** until goals are achieved
- **Self-verify** by checking results and fixing errors

## ReAct Pattern (Reasoning and Acting)

The ReAct pattern is a framework for building more capable AI agents:

```
1. REASON → Think about what needs to be done
2. ACT    → Use tools to gather info or make changes
3. OBSERVE → Analyze the results
4. ITERATE → Repeat until the goal is achieved
```

## Implementation in OperaStudio

### System Architecture

```
┌─────────────────┐
│   User Request  │
└────────┬────────┘
         │
    ┌────▼─────┐
    │  Gemini  │ ◄─── Enhanced System Prompt (ReAct instructions)
    │   AI     │
    └────┬─────┘
         │
    ┌────▼─────────────────────┐
    │  Function Call Loop      │
    │  (up to 10 rounds)       │
    └────┬─────────────────────┘
         │
    ┌────▼─────┐
    │  Tools   │
    │  (22)    │
    └────┬─────┘
         │
    ┌────▼──────────┐
    │ Local Agent   │
    └───────────────┘
```

### Available Tools (27 Total)

#### File Operations (8 tools)
- `read_file` - Read file contents
- `write_file` - Write to files
- `delete_file` - Delete files
- `move_file` - Move/rename files
- `copy_file` - Copy files
- `get_file_info` - Get file metadata
- `search_files` - Find files by pattern
- `search_content` - Search file contents (grep)

#### Directory Operations (4 tools)
- `list_directory` - List directory contents
- `create_directory` - Create directories
- `delete_directory` - Delete directories
- `get_directory_size` - Calculate directory size

#### System Operations (5 tools)
- `execute_command` - Run shell commands
- `get_system_info` - Get system information
- `get_process_list` - List running processes
- `get_environment_variables` - Get env vars
- `get_current_directory` - Get current working directory

#### System Health Monitoring (5 tools) 🆕
- `get_system_health` - Comprehensive health report with warnings
- `get_cpu_usage` - Detailed CPU usage and specs
- `get_memory_usage` - Memory statistics
- `get_disk_space` - Disk space information
- `get_network_info` - Network interface details

#### Development Tools (5 tools)
- `run_npm_command` - Run npm/pnpm commands
- `git_status` - Get git status
- `git_diff` - Get git diff
- `install_package` - Install npm packages

## Example Agentic Workflows

### Example 1: Simple Task
**User:** "What files are in my project?"

**AI Workflow:**
1. **Reason:** Need to get current directory and list files
2. **Act:** Call `get_current_directory`
3. **Observe:** Current dir is `/home/dp/Documents/op1.0`
4. **Act:** Call `list_directory` with path
5. **Observe:** Get file list
6. **Complete:** Present formatted file list to user

**Tool Calls:** 2 rounds

---

### Example 2: Multi-Step Task
**User:** "Create a new React component called Button with tests"

**AI Workflow:**
1. **Reason:** Need to understand project structure first
2. **Act:** `get_current_directory` and `list_directory`
3. **Observe:** Identify components are in `/src/components`
4. **Reason:** Need to create component file
5. **Act:** `write_file` - Create `/src/components/Button.tsx`
6. **Observe:** File created successfully
7. **Reason:** Need to create test file
8. **Act:** `write_file` - Create `/src/components/Button.test.tsx`
9. **Observe:** Test file created
10. **Reason:** Should verify tests work
11. **Act:** `execute_command` - Run `npm test Button`
12. **Observe:** Tests pass
13. **Complete:** Confirm to user that component and tests are ready

**Tool Calls:** 6+ rounds

---

### Example 3: Complex Debugging Workflow
**User:** "My build is failing, can you fix it?"

**AI Workflow:**
1. **Reason:** Need to run build and see the error
2. **Act:** `execute_command` - `npm run build`
3. **Observe:** Error about missing dependency "react-icons"
4. **Reason:** Need to install the missing package
5. **Act:** `install_package` - Install react-icons
6. **Observe:** Package installed successfully
7. **Reason:** Should retry the build
8. **Act:** `execute_command` - `npm run build` again
9. **Observe:** New error about TypeScript types
10. **Reason:** Need to check the file with errors
11. **Act:** `read_file` - Read the problematic file
12. **Observe:** Identify type mismatch
13. **Reason:** Need to fix the types
14. **Act:** `write_file` - Update file with correct types
15. **Reason:** Verify the fix
16. **Act:** `execute_command` - `npm run build` again
17. **Observe:** Build succeeds!
18. **Complete:** Explain what was fixed

**Tool Calls:** 8+ rounds

---

### Example 4: Full Feature Implementation
**User:** "Add authentication to my Next.js app with Clerk"

**AI Workflow:**
1. **Reason:** Check if Clerk is already installed
2. **Act:** `read_file` - Check package.json
3. **Observe:** Clerk not installed
4. **Reason:** Need to install Clerk
5. **Act:** `install_package` - Install @clerk/nextjs
6. **Observe:** Package installed
7. **Reason:** Need to create environment variable file
8. **Act:** `write_file` - Create .env.local with Clerk keys
9. **Reason:** Need to add middleware
10. **Act:** `write_file` - Create middleware.ts
11. **Reason:** Need to wrap app in ClerkProvider
12. **Act:** `read_file` - Read app layout
13. **Observe:** Current layout structure
14. **Act:** `write_file` - Update layout with ClerkProvider
15. **Reason:** Should create protected route example
16. **Act:** `create_directory` - Create app/dashboard
17. **Act:** `write_file` - Create dashboard page
18. **Reason:** Test the setup
19. **Act:** `execute_command` - `npm run dev`
20. **Observe:** Server starts successfully
21. **Complete:** Guide user on next steps

**Tool Calls:** 10+ rounds

---

### Example 5: System Health Monitoring 🆕
**User:** "What's my system health?"

**AI Workflow:**
1. **Reason:** Need comprehensive system health overview
2. **Act:** Call `get_system_health`
3. **Observe:** Status is "warning" with high memory usage (90%)
4. **Reason:** Need to identify what's using the memory
5. **Act:** Call `get_process_list`
6. **Observe:** Find several Node.js processes using 8GB combined
7. **Reason:** Should provide detailed analysis
8. **Act:** Call `get_memory_usage` for detailed breakdown
9. **Observe:** 90% memory usage confirmed
10. **Complete:** Present comprehensive health report with recommendations

**Tool Calls:** 3 rounds

**Example Output:**
```
⚠️ System Health: WARNING

System Overview:
- Platform: Linux
- Hostname: dev-machine
- Uptime: 48.50 hours

Resource Usage:
- CPU: 35% (8 cores) ✅
- Memory: 90% used (26.33 GB / 29.25 GB) ⚠️
- Disk: 70% used (350 GB / 500 GB) ✅

Warnings:
- High memory usage: 90%

Recommendations:
- Consider closing unused applications
- Found 12 Node.js processes using 8GB total
- Restart development servers to free memory
```

## How to Use Agentic Features

### Simple Requests
Just ask naturally - the AI will use tools automatically:

```
"What's in my current directory?"
"Show me the package.json file"
"What's my system info?"
```

### Complex Multi-Step Requests
Be specific about your goal, and the AI will break it down:

```
"Set up a new API route at /api/users that connects to a database"
"Debug why my tests are failing and fix them"
"Refactor my components to use TypeScript"
"Install and configure Tailwind CSS in this project"
```

### Verification Workflows
Ask the AI to check and fix issues:

```
"Make sure all my tests pass, and fix any that don't"
"Check if my build works and resolve any errors"
"Verify my dependencies are up to date"
```

## Technical Details

### Configuration

**System Prompt Location:** `lib/gemini-config.ts`
- Enhanced with ReAct pattern instructions
- Tool usage best practices
- Multi-step workflow guidance

**Function Call Rounds:** `app/api/chat/route.ts`
```typescript
const MAX_FUNCTION_CALL_ROUNDS = 10;
```

**Tool Definitions:** `lib/gemini-tools.ts`
- 22 comprehensive tools
- Detailed descriptions for AI understanding

### How It Works

1. **User sends message** to chat interface
2. **Gemini AI analyzes** the request with enhanced system prompt
3. **AI decides** if tools are needed
4. **Tool execution loop** begins:
   - AI calls a tool (e.g., `list_directory`)
   - Request sent to local agent via WebSocket/Redis
   - Local agent executes tool securely
   - Result returned to AI
   - AI analyzes result and decides next action
   - Repeat until task complete or max rounds reached
5. **Final response** streamed to user

### Permission & Security

All tool operations go through permission checks:
- File operations: Path validation, sandboxing
- Commands: Whitelist/blacklist checking
- Destructive operations: Require explicit user confirmation

## Best Practices

### For Users

**Be Clear About Goals:**
```
✅ "Create a new React component with tests and run them"
❌ "Make a component"
```

**Let AI Explore:**
```
✅ "Fix the build errors"
✅ "Debug why tests are failing"
```

**Provide Context When Needed:**
```
✅ "Add authentication - I want to use Clerk with email/password"
❌ "Add authentication" (AI will ask for clarification)
```

### For Developers

**Increase Rounds for Complex Tasks:**
```typescript
const MAX_FUNCTION_CALL_ROUNDS = 15; // For very complex workflows
```

**Add Domain-Specific Tools:**
```typescript
// In lib/gemini-tools.ts
{
  name: "check_api_health",
  description: "Check if API endpoints are responding",
  parameters: { ... }
}
```

**Monitor Tool Usage:**
Check Redis logs and local agent logs to see tool call patterns.

## Limitations

1. **Max Rounds:** Currently 10 rounds per request
   - Prevents infinite loops
   - Can be increased if needed

2. **No Persistent State:**
   - Each conversation turn is independent
   - AI doesn't remember tool results from previous messages

3. **Permission Boundaries:**
   - Some operations require user confirmation
   - File operations are sandboxed to project directory

## Future Enhancements

Potential improvements:
- **Persistent memory** across conversation turns
- **Parallel tool execution** (run multiple tools simultaneously)
- **Custom tool plugins** (users can add their own tools)
- **Workflow templates** (save common multi-step workflows)
- **Visual workflow display** (show the ReAct loop in UI)

## Troubleshooting

**AI not using tools:**
- Check if local agent is connected (status indicator)
- Verify tools are defined in `lib/gemini-tools.ts`

**Tool execution errors:**
- Check local agent logs
- Verify permissions in `local-agent/src/tools/permissions.ts`

**Hitting max rounds:**
- Increase `MAX_FUNCTION_CALL_ROUNDS`
- Break down request into smaller tasks

## Summary

OperaStudio AI now supports sophisticated agentic workflows using:
- ✅ **27 comprehensive tools** for file, directory, system, health monitoring, and dev operations
- ✅ **ReAct pattern** for reasoning and acting
- ✅ **Multi-step execution** up to 10 rounds
- ✅ **Self-verification** and error handling
- ✅ **Autonomous planning** for complex tasks
- ✅ **System health monitoring** with intelligent warnings (NEW)

Try it out with:
- *"Set up a new React component with tests and make sure they pass"*
- *"What's my system health?"* (NEW)
- *"Check if I have enough resources to compile my project"* (NEW)

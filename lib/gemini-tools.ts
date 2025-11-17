/**
 * Comprehensive tool definitions for Gemini function calling
 * These match the tools available on the local agent
 */
export const tools = [
  {
    functionDeclarations: [
      // ===== FILE OPERATIONS =====
      {
        name: "read_file",
        description: "Read the contents of a file from the user's local file system.",
        parameters: {
          type: "object" as const,
          properties: {
            path: {
              type: "string" as const,
              description: "Absolute path to the file to read",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "write_file",
        description: "Write content to a file on the user's local file system. Creates parent directories if needed.",
        parameters: {
          type: "object" as const,
          properties: {
            path: {
              type: "string" as const,
              description: "Absolute path where the file should be written",
            },
            content: {
              type: "string" as const,
              description: "The content to write to the file",
            },
          },
          required: ["path", "content"],
        },
      },
      {
        name: "delete_file",
        description: "Delete a file from the user's local file system.",
        parameters: {
          type: "object" as const,
          properties: {
            path: {
              type: "string" as const,
              description: "Absolute path to the file to delete",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "move_file",
        description: "Move or rename a file on the user's local file system.",
        parameters: {
          type: "object" as const,
          properties: {
            source: {
              type: "string" as const,
              description: "Absolute path to the source file",
            },
            destination: {
              type: "string" as const,
              description: "Absolute path to the destination",
            },
          },
          required: ["source", "destination"],
        },
      },
      {
        name: "copy_file",
        description: "Copy a file on the user's local file system.",
        parameters: {
          type: "object" as const,
          properties: {
            source: {
              type: "string" as const,
              description: "Absolute path to the source file",
            },
            destination: {
              type: "string" as const,
              description: "Absolute path to the destination",
            },
          },
          required: ["source", "destination"],
        },
      },
      {
        name: "get_file_info",
        description: "Get metadata about a file (size, permissions, modified date, etc.).",
        parameters: {
          type: "object" as const,
          properties: {
            path: {
              type: "string" as const,
              description: "Absolute path to the file",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "search_files",
        description: "Search for files by name pattern in a directory.",
        parameters: {
          type: "object" as const,
          properties: {
            path: {
              type: "string" as const,
              description: "Directory path to search in",
            },
            pattern: {
              type: "string" as const,
              description: "File name pattern (glob pattern, e.g., '*.js', 'test-*.txt')",
            },
            recursive: {
              type: "boolean" as const,
              description: "Whether to search recursively in subdirectories (default: false)",
            },
          },
          required: ["path", "pattern"],
        },
      },
      {
        name: "search_content",
        description: "Search for text content within files (grep). Returns files containing the search text.",
        parameters: {
          type: "object" as const,
          properties: {
            path: {
              type: "string" as const,
              description: "Directory path to search in",
            },
            query: {
              type: "string" as const,
              description: "Text to search for",
            },
            file_pattern: {
              type: "string" as const,
              description: "Optional file pattern to filter (e.g., '*.js')",
            },
            recursive: {
              type: "boolean" as const,
              description: "Whether to search recursively (default: true)",
            },
          },
          required: ["path", "query"],
        },
      },

      // ===== DIRECTORY OPERATIONS =====
      {
        name: "list_directory",
        description: "List files and directories in a directory on the user's local file system.",
        parameters: {
          type: "object" as const,
          properties: {
            path: {
              type: "string" as const,
              description: "Absolute path to the directory to list",
            },
            recursive: {
              type: "boolean" as const,
              description: "Whether to list files recursively in subdirectories (default: false)",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "create_directory",
        description: "Create a new directory. Creates parent directories if needed.",
        parameters: {
          type: "object" as const,
          properties: {
            path: {
              type: "string" as const,
              description: "Absolute path to the directory to create",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "delete_directory",
        description: "Delete a directory and all its contents.",
        parameters: {
          type: "object" as const,
          properties: {
            path: {
              type: "string" as const,
              description: "Absolute path to the directory to delete",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "get_directory_size",
        description: "Calculate the total size of a directory and its contents.",
        parameters: {
          type: "object" as const,
          properties: {
            path: {
              type: "string" as const,
              description: "Absolute path to the directory",
            },
          },
          required: ["path"],
        },
      },

      // ===== SYSTEM OPERATIONS =====
      {
        name: "execute_command",
        description: "Execute a shell command on the user's local machine. Commands are subject to permission restrictions.",
        parameters: {
          type: "object" as const,
          properties: {
            command: {
              type: "string" as const,
              description: "The shell command to execute",
            },
            cwd: {
              type: "string" as const,
              description: "Working directory for the command (optional)",
            },
            timeout: {
              type: "number" as const,
              description: "Timeout in milliseconds (optional, default 300000 = 5 minutes)",
            },
          },
          required: ["command"],
        },
      },
      {
        name: "get_system_info",
        description: "Get system information including OS, platform, CPU, memory, and hostname.",
        parameters: {
          type: "object" as const,
          properties: {},
        },
      },
      {
        name: "get_process_list",
        description: "Get list of running processes on the system.",
        parameters: {
          type: "object" as const,
          properties: {
            filter: {
              type: "string" as const,
              description: "Optional filter to search for specific processes",
            },
          },
        },
      },
      {
        name: "get_environment_variables",
        description: "Get environment variables. Can retrieve all or specific variables.",
        parameters: {
          type: "object" as const,
          properties: {
            names: {
              type: "string" as const,
              description: "Optional comma-separated list of specific variable names to retrieve",
            },
          },
        },
      },
      {
        name: "get_current_directory",
        description: "Get the current working directory of the agent.",
        parameters: {
          type: "object" as const,
          properties: {},
        },
      },
      {
        name: "get_cpu_usage",
        description: "Get detailed CPU usage information including cores, model, speed, and current usage percentage.",
        parameters: {
          type: "object" as const,
          properties: {},
        },
      },
      {
        name: "get_disk_space",
        description: "Get disk space information for a specific path or the root filesystem.",
        parameters: {
          type: "object" as const,
          properties: {
            path: {
              type: "string" as const,
              description: "Optional path to check disk space for (defaults to root filesystem)",
            },
          },
        },
      },
      {
        name: "get_memory_usage",
        description: "Get detailed memory usage information including total, used, free memory and usage percentage.",
        parameters: {
          type: "object" as const,
          properties: {},
        },
      },
      {
        name: "get_network_info",
        description: "Get network interface information including IP addresses, MAC addresses, and interface types.",
        parameters: {
          type: "object" as const,
          properties: {},
        },
      },
      {
        name: "get_system_health",
        description: "Get comprehensive system health report including CPU, memory, disk usage with health status (healthy/warning/critical) and warnings.",
        parameters: {
          type: "object" as const,
          properties: {},
        },
      },

      // ===== DEVELOPMENT TOOLS =====
      {
        name: "run_npm_command",
        description: "Run an npm or pnpm command in a specific directory.",
        parameters: {
          type: "object" as const,
          properties: {
            command: {
              type: "string" as const,
              description: "The npm/pnpm command (e.g., 'install', 'run build', 'test')",
            },
            cwd: {
              type: "string" as const,
              description: "Directory to run the command in",
            },
            package_manager: {
              type: "string" as const,
              description: "Package manager to use: 'npm' or 'pnpm' (default: 'npm')",
            },
          },
          required: ["command", "cwd"],
        },
      },
      {
        name: "git_status",
        description: "Get the git status of a repository.",
        parameters: {
          type: "object" as const,
          properties: {
            path: {
              type: "string" as const,
              description: "Path to the git repository",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "git_diff",
        description: "Get the git diff showing changes in a repository.",
        parameters: {
          type: "object" as const,
          properties: {
            path: {
              type: "string" as const,
              description: "Path to the git repository",
            },
            staged: {
              type: "boolean" as const,
              description: "Show staged changes only (default: false shows unstaged)",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "install_package",
        description: "Install an npm package in a project.",
        parameters: {
          type: "object" as const,
          properties: {
            package_name: {
              type: "string" as const,
              description: "Name of the package to install",
            },
            cwd: {
              type: "string" as const,
              description: "Project directory",
            },
            dev: {
              type: "boolean" as const,
              description: "Install as dev dependency (default: false)",
            },
            package_manager: {
              type: "string" as const,
              description: "Package manager: 'npm' or 'pnpm' (default: 'npm')",
            },
          },
          required: ["package_name", "cwd"],
        },
      },
    ],
  },
];

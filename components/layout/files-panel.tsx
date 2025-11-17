"use client";

import { ChevronRight, Folder, File, Loader2, AlertCircle, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback, useRef } from "react";

interface FileNode {
  id: string; // Full path used as ID
  name: string;
  type: "file" | "folder";
  path: string; // Full absolute path
  size?: number;
  modified?: string;
  children?: FileNode[];
  isLoading?: boolean;
  error?: string;
  loaded?: boolean; // Whether children have been loaded
}

interface FilesPanelProps {
  collapsed: boolean;
}

interface DirectoryListing {
  path: string;
  files: Array<{
    name: string;
    type: "file" | "folder";
    size?: number;
    modified?: string;
  }>;
}

export function FilesPanel({ collapsed }: FilesPanelProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [isLoadingRoot, setIsLoadingRoot] = useState(true);
  const [rootError, setRootError] = useState<string | null>(null);
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const loadingPathsRef = useRef<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync ref with state
  useEffect(() => {
    loadingPathsRef.current = loadingPaths;
  }, [loadingPaths]);

  // Load directory contents
  const loadDirectory = useCallback(async (path: string) => {
    // Check if already loading using ref to avoid dependency issues
    if (loadingPathsRef.current.has(path)) return;

    setLoadingPaths((prev) => {
      const next = new Set(prev);
      next.add(path);
      loadingPathsRef.current = next;
      return next;
    });

    try {
      const response = await fetch("/api/files/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        console.error(`Failed to load directory ${path}:`, errorData);
        throw new Error(errorData.error || "Failed to list directory");
      }

      const data: DirectoryListing = await response.json();

      // Helper to join paths (handles trailing slashes)
      const joinPath = (base: string, name: string) => {
        const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
        return `${normalizedBase}/${name}`;
      };

      // Update file tree with loaded children
      setFileTree((prevTree) => {
        const updateNode = (nodes: FileNode[]): FileNode[] => {
          return nodes.map((node) => {
            if (node.path === path) {
              // Convert files to FileNode format
              const children: FileNode[] = data.files.map((file) => ({
                id: joinPath(path, file.name),
                name: file.name,
                type: file.type,
                path: joinPath(path, file.name),
                size: file.size,
                modified: file.modified,
                loaded: false,
              }));

              return {
                ...node,
                children,
                loaded: true,
                isLoading: false,
                error: undefined,
              };
            }

            if (node.children) {
              return {
                ...node,
                children: updateNode(node.children),
              };
            }

            return node;
          });
        };

        // If tree is empty and this is the root, initialize it
        // Otherwise update existing nodes
        if (prevTree.length === 0) {
          return data.files.map((file) => ({
            id: joinPath(path, file.name),
            name: file.name,
            type: file.type,
            path: joinPath(path, file.name),
            size: file.size,
            modified: file.modified,
            loaded: false,
          }));
        }

        return updateNode(prevTree);
      });
    } catch (error: any) {
      console.error(`Failed to load directory ${path}:`, error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        path,
      });

      // Update node with error
      setFileTree((prevTree) => {
        const updateNode = (nodes: FileNode[]): FileNode[] => {
          return nodes.map((node) => {
            if (node.path === path) {
              return {
                ...node,
                isLoading: false,
                error: error.message || "Failed to load directory",
              };
            }

            if (node.children) {
              return {
                ...node,
                children: updateNode(node.children),
              };
            }

            return node;
          });
        };

        return updateNode(prevTree);
      });
    } finally {
      setLoadingPaths((prev) => {
        const next = new Set(prev);
        next.delete(path);
        loadingPathsRef.current = next;
        return next;
      });
    }
  }, []); // No dependencies - use refs for all state checks

  // Fetch root directory
  const fetchRoot = useCallback(async () => {
    setIsLoadingRoot(true);
    setRootError(null);
    setFileTree([]);
    setExpandedFolders(new Set());
    setSelectedId(null);
    loadingPathsRef.current.clear();
    setLoadingPaths(new Set());

    try {
      const response = await fetch("/api/files/list", {
        method: "GET",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        console.error('Failed to get root directory:', errorData);
        throw new Error(errorData.error || "Failed to get root directory");
      }

      const data = await response.json();
      const newRootPath = data.rootPath;
      setRootPath(newRootPath);

      // Load root directory contents directly without dependency
      if (!loadingPathsRef.current.has(newRootPath)) {
        loadingPathsRef.current.add(newRootPath);
        setLoadingPaths(new Set(loadingPathsRef.current));

        try {
          const listResponse = await fetch("/api/files/list", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ path: newRootPath }),
          });

          if (!listResponse.ok) {
            const error = await listResponse.json();
            throw new Error(error.error || "Failed to list directory");
          }

          const listData: DirectoryListing = await listResponse.json();

          // Helper to join paths (handles trailing slashes)
          const joinPath = (base: string, name: string) => {
            const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
            return `${normalizedBase}/${name}`;
          };

          setFileTree(
            listData.files.map((file) => ({
              id: joinPath(newRootPath, file.name),
              name: file.name,
              type: file.type,
              path: joinPath(newRootPath, file.name),
              size: file.size,
              modified: file.modified,
              loaded: false,
            }))
          );
        } catch (error: any) {
          console.error(`Failed to load root directory ${newRootPath}:`, error);
          setRootError(error.message || "Failed to load file system");
        } finally {
          loadingPathsRef.current.delete(newRootPath);
          setLoadingPaths(new Set(loadingPathsRef.current));
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch root directory:", error);
      setRootError(error.message || "Failed to load file system");
    } finally {
      setIsLoadingRoot(false);
    }
  }, []); // No dependencies - stable function

  // Fetch root directory on mount
  useEffect(() => {
    if (collapsed) return;
    fetchRoot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed]); // Only depend on collapsed, fetchRoot is stable

  const toggleFolder = async (node: FileNode) => {
    const isExpanded = expandedFolders.has(node.id);

    if (isExpanded) {
      // Collapse folder
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        next.delete(node.id);
        return next;
      });
    } else {
      // Expand folder
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        next.add(node.id);
        return next;
      });

      // Load directory contents if not already loaded
      if (!node.loaded && !node.isLoading && !node.error && !loadingPathsRef.current.has(node.path)) {
        // Update loading state
        setFileTree((prevTree) => {
          const updateNode = (nodes: FileNode[]): FileNode[] => {
            return nodes.map((n) => {
              if (n.id === node.id) {
                return { ...n, isLoading: true };
              }
              if (n.children) {
                return { ...n, children: updateNode(n.children) };
              }
              return n;
            });
          };
          return updateNode(prevTree);
        });

        await loadDirectory(node.path);
      }
    }
  };

  const handleFileClick = async (node: FileNode, event: React.MouseEvent) => {
    // Single click - select file
    setSelectedId(node.id);

    // Single click on file - open in Monaco Editor
    if (node.type === "file") {
      openFileInEditor(node.path);
    }
  };

  const openFileInEditor = (path: string) => {
    // Call the global function exposed by SplitView
    if (typeof window !== 'undefined' && (window as any).__operaStudioOpenFile) {
      (window as any).__operaStudioOpenFile(path);
    }
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedId === node.id;
    const isLoading = node.isLoading || loadingPaths.has(node.path);

    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex h-9 cursor-pointer items-center gap-1.5 rounded-lg transition-all duration-150 select-none",
            isSelected ? "bg-elevated" : "hover:bg-surface",
            "text-sm active:scale-[0.98]"
          )}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={(e) => {
            if (node.type === "folder") {
              toggleFolder(node);
            } else {
              handleFileClick(node, e);
            }
          }}
        >
          {node.type === "folder" && (
            <div className="h-4 w-4 flex-shrink-0 flex items-center justify-center">
              {isLoading ? (
                <Loader2 className="h-3 w-3 text-text-muted animate-spin" />
              ) : (
                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-text-muted transition-transform duration-150",
                    isExpanded && "rotate-90"
                  )}
                />
              )}
            </div>
          )}
          {node.type === "folder" ? (
            <Folder className="h-4 w-4 flex-shrink-0 text-text-muted" />
          ) : (
            <File className="h-4 w-4 flex-shrink-0 text-text-muted" />
          )}
          <span className="truncate text-[13px] text-text-primary flex-1">
            {node.name}
          </span>
          {node.error && (
            <AlertCircle className="h-3 w-3 flex-shrink-0 text-red-500" />
          )}
        </div>
        {node.type === "folder" && isExpanded && (
          <div>
            {node.error ? (
              <div
                className="text-xs text-red-500 px-2 py-1"
                style={{ paddingLeft: `${12 + (depth + 1) * 16}px` }}
              >
                {node.error}
              </div>
            ) : node.children && node.children.length > 0 ? (
              node.children.map((child) => renderNode(child, depth + 1))
            ) : node.loaded && node.children?.length === 0 ? (
              <div
                className="text-xs text-text-muted px-2 py-1 italic"
                style={{ paddingLeft: `${12 + (depth + 1) * 16}px` }}
              >
                Empty folder
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  if (collapsed) return null;

  // Loading state
  if (isLoadingRoot) {
    return (
      <div className="flex-1 flex items-center justify-center px-2 py-3 min-h-0">
        <div className="flex flex-col items-center gap-2 text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-xs">Loading file system...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (rootError) {
    return (
      <div className="flex-1 flex items-center justify-center px-2 py-3 min-h-0">
        <div className="flex flex-col items-center gap-2 text-red-500">
          <AlertCircle className="h-5 w-5" />
          <span className="text-xs text-center">{rootError}</span>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-text-secondary hover:text-text-primary underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (fileTree.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-2 py-3 min-h-0">
        <div className="text-xs text-text-muted text-center">
          No files found
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 h-full">
      {rootPath && (
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-text-muted border-b border-surface shrink-0">
          <span className="truncate flex-1" title={rootPath}>
            {rootPath}
          </span>
          <button
            onClick={fetchRoot}
            disabled={isLoadingRoot}
            className="p-1 hover:bg-surface rounded transition-colors disabled:opacity-50"
            title="Refresh file tree"
            aria-label="Refresh file tree"
          >
            <RefreshCw className={cn("h-3 w-3", isLoadingRoot && "animate-spin")} />
          </button>
        </div>
      )}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 min-h-0"
      >
        <div className="space-y-0.5">
          {fileTree.map((node) => renderNode(node))}
        </div>
      </div>
    </div>
  );
}

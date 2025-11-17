"use client";

import { ChevronRight, Folder, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
}

interface FilesPanelProps {
  collapsed: boolean;
}

export function FilesPanel({ collapsed }: FilesPanelProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fileTree: FileNode[] = [
    {
      id: "1",
      name: "src",
      type: "folder",
      children: [
        {
          id: "2",
          name: "components",
          type: "folder",
          children: [
            { id: "3", name: "Button.tsx", type: "file" },
            { id: "4", name: "Input.tsx", type: "file" },
          ],
        },
        { id: "5", name: "app.tsx", type: "file" },
        { id: "6", name: "index.tsx", type: "file" },
      ],
    },
    {
      id: "7",
      name: "public",
      type: "folder",
      children: [
        { id: "8", name: "logo.svg", type: "file" },
        { id: "9", name: "favicon.ico", type: "file" },
      ],
    },
    { id: "10", name: "package.json", type: "file" },
    { id: "11", name: "tsconfig.json", type: "file" },
  ];

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedId === node.id;

    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex h-9 cursor-pointer items-center gap-1.5 rounded-lg transition-all duration-150",
            isSelected ? "bg-elevated" : "hover:bg-surface",
            "text-sm"
          )}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => {
            if (node.type === "folder") {
              toggleFolder(node.id);
            } else {
              setSelectedId(node.id);
            }
          }}
        >
          {node.type === "folder" && (
            <ChevronRight
              className={cn(
                "h-4 w-4 flex-shrink-0 text-text-muted transition-transform duration-150",
                isExpanded && "rotate-90"
              )}
            />
          )}
          {node.type === "folder" ? (
            <Folder className="h-4 w-4 flex-shrink-0 text-text-muted" />
          ) : (
            <File className="h-4 w-4 flex-shrink-0 text-text-muted" />
          )}
          <span className="truncate text-[13px] text-text-primary">
            {node.name}
          </span>
        </div>
        {node.type === "folder" && isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (collapsed) return null;

  return (
    <div className="flex-1 overflow-y-auto px-2 py-3">
      <div className="space-y-0.5">
        {fileTree.map((node) => renderNode(node))}
      </div>
    </div>
  );
}

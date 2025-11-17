"use client";

import { useState } from "react";
import { X, AlertTriangle, FileEdit, Trash2, FileCheck } from "lucide-react";
import { DiffEditor } from "@monaco-editor/react";
import { cn } from "@/lib/utils";

export interface FileConfirmationData {
  operation: string;
  path: string;
  fileType: 'critical' | 'safe' | 'destructive';
  oldContent?: string;
  newContent?: string;
  reason?: string;
}

interface FileConfirmationDialogProps {
  data: FileConfirmationData;
  onApprove: () => void;
  onReject: () => void;
}

export function FileConfirmationDialog({ data, onApprove, onReject }: FileConfirmationDialogProps) {
  const [isApproving, setIsApproving] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove();
    } finally {
      setIsApproving(false);
    }
  };

  const getIcon = () => {
    switch (data.fileType) {
      case 'destructive':
        return <Trash2 className="h-6 w-6 text-destructive" />;
      case 'critical':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      default:
        return <FileEdit className="h-6 w-6 text-blue-500" />;
    }
  };

  const getTitle = () => {
    switch (data.operation) {
      case 'write_file':
        return data.oldContent ? 'Confirm File Edit' : 'Confirm File Creation';
      case 'delete_file':
        return 'Confirm File Deletion';
      default:
        return 'Confirm File Operation';
    }
  };

  const getLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'json': 'json',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'md': 'markdown',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'sh': 'shell',
    };
    return langMap[ext || ''] || 'plaintext';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-[90vw] max-w-5xl max-h-[90vh] bg-background border border-border rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          {getIcon()}
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{getTitle()}</h2>
            <p className="text-sm text-muted-foreground">{data.path}</p>
          </div>
          <button
            onClick={onReject}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Warning/Info */}
          <div className={cn(
            "px-4 py-3 border-b border-border flex items-center gap-2",
            data.fileType === 'critical' && "bg-yellow-500/10",
            data.fileType === 'destructive' && "bg-destructive/10",
            data.fileType === 'safe' && "bg-blue-500/10"
          )}>
            {data.fileType === 'critical' && (
              <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
            )}
            {data.fileType === 'destructive' && (
              <Trash2 className="h-4 w-4 text-destructive flex-shrink-0" />
            )}
            {data.fileType === 'safe' && (
              <FileCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
            )}
            <p className="text-sm">
              {data.reason || 'This file operation requires your confirmation before proceeding.'}
            </p>
          </div>

          {/* Diff Editor */}
          {data.oldContent !== undefined && data.newContent !== undefined && (
            <div className="flex-1 overflow-hidden">
              <DiffEditor
                original={data.oldContent}
                modified={data.newContent}
                language={getLanguage(data.path)}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  lineNumbers: 'on',
                  renderSideBySide: true,
                  wordWrap: 'on',
                }}
              />
            </div>
          )}

          {/* File Stats */}
          <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground">
            {data.oldContent !== undefined && data.newContent !== undefined && (
              <>
                <span>Lines: {data.newContent.split('\n').length}</span>
                <span className="text-green-500">
                  +{data.newContent.split('\n').length - data.oldContent.split('\n').length} lines
                </span>
                <span>Size: {new Blob([data.newContent]).size} bytes</span>
              </>
            )}
            {data.oldContent === undefined && data.newContent && (
              <>
                <span>New file</span>
                <span>Lines: {data.newContent.split('\n').length}</span>
                <span>Size: {new Blob([data.newContent]).size} bytes</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border bg-muted/20">
          <button
            onClick={onReject}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-md transition-colors"
            disabled={isApproving}
          >
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className={cn(
              "px-4 py-2 text-sm font-medium text-white rounded-md transition-colors",
              data.fileType === 'destructive' && "bg-destructive hover:bg-destructive/90",
              data.fileType === 'critical' && "bg-yellow-600 hover:bg-yellow-700",
              data.fileType === 'safe' && "bg-blue-600 hover:bg-blue-700",
              isApproving && "opacity-50 cursor-not-allowed"
            )}
          >
            {isApproving ? 'Approving...' : 'Approve & Execute'}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect } from "react";
import { X, FileText, Globe } from "lucide-react";
import { MonacoEditor } from "./monaco-editor";
import { WebViewer } from "./web-viewer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEditor, type OpenTab, type OpenFile } from "@/contexts/editor-context";

interface SplitViewProps {
  chatComponent: React.ReactNode;
  onFileRead?: (path: string) => Promise<string>;
  onFileSave?: (path: string, content: string) => Promise<void>;
}

export function SplitView({ chatComponent, onFileRead, onFileSave }: SplitViewProps) {
  const {
    openFiles, setOpenFiles, activeFileIndex, setActiveFileIndex, activeFile,
    openTabs, setOpenTabs, activeTabIndex, setActiveTabIndex, activeTab
  } = useEditor();

  // Function to be called from file tree clicks
  const openFile = useCallback(async (path: string) => {
    // Check if file is already open as a tab
    const existingTabIndex = openTabs.findIndex(tab => tab.type === 'file' && tab.path === path);
    if (existingTabIndex !== -1) {
      setActiveTabIndex(existingTabIndex);
      return;
    }

    // Check if file is already in openFiles
    const existingFileIndex = openFiles.findIndex(f => f.path === path);
    let fileContent = "";
    
    if (existingFileIndex !== -1) {
      // Use existing file content
      fileContent = openFiles[existingFileIndex].content;
    } else {
      try {
        // Read file content
        fileContent = onFileRead ? await onFileRead(path) : "";
        
        // Add to open files
        const newFile: OpenFile = {
          path,
          content: fileContent,
          isDirty: false,
        };
        setOpenFiles(prev => [...prev, newFile]);
      } catch (error: any) {
        toast.error(`Failed to open file: ${error.message}`);
        return;
      }
    }

    // Create a tab for the file to show in split view
    const fileName = path.split('/').pop() || path;
    const newTab: OpenTab = {
      type: 'file',
      id: `file-${Date.now()}-${path}`,
      title: fileName,
      path,
      content: fileContent,
      isDirty: false,
    };

    setOpenTabs(prev => [...prev, newTab]);
    setActiveTabIndex(openTabs.length);

    toast.success(`Opened ${fileName}`);
  }, [openFiles, openTabs, onFileRead, setOpenFiles, setOpenTabs, setActiveTabIndex]);

  const closeFile = useCallback((index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();

    const file = openFiles[index];
    if (file.isDirty) {
      const confirmed = window.confirm(`${file.path} has unsaved changes. Close anyway?`);
      if (!confirmed) return;
    }

    setOpenFiles(prev => prev.filter((_, i) => i !== index));

    // Adjust active index if needed
    if (activeFileIndex >= index && activeFileIndex > 0) {
      setActiveFileIndex(prev => prev - 1);
    }
  }, [openFiles, activeFileIndex]);

  const handleFileChange = useCallback((index: number, value: string | undefined) => {
    if (value === undefined) return;

    setOpenFiles(prev => prev.map((file, i) =>
      i === index
        ? { ...file, content: value, isDirty: true }
        : file
    ));
  }, []);

  const handleFileSave = useCallback(async (index: number) => {
    const file = openFiles[index];
    if (!file || !onFileSave) return;

    try {
      await onFileSave(file.path, file.content);

      setOpenFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, isDirty: false } : f
      ));

      toast.success(`Saved ${file.path.split('/').pop()}`);
    } catch (error: any) {
      toast.error(`Failed to save file: ${error.message}`);
    }
  }, [openFiles, onFileSave]);

  const closeTab = useCallback((index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();

    const tab = openTabs[index];
    if (tab.type === 'file' && tab.isDirty) {
      const confirmed = window.confirm(`${tab.title} has unsaved changes. Close anyway?`);
      if (!confirmed) return;
    }

    setOpenTabs(prev => prev.filter((_, i) => i !== index));

    // Adjust active index if needed
    if (activeTabIndex >= index && activeTabIndex > 0) {
      setActiveTabIndex(prev => prev - 1);
    }
  }, [openTabs, activeTabIndex]);

  const hasOpenFiles = openFiles.length > 0;
  const hasOpenTabs = openTabs.length > 0;

  // Expose functions globally for cross-component communication
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__operaStudioOpenFile = openFile;
      (window as any).__operaStudioUpdateFileContent = (path: string, content: string) => {
        // Update the file content if it's open in the editor
        setOpenFiles(prev => prev.map(file =>
          file.path === path
            ? { ...file, content, isDirty: false }
            : file
        ));
      };
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__operaStudioOpenFile;
        delete (window as any).__operaStudioUpdateFileContent;
      }
    };
  }, [openFile]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left side - Chat (50%) */}
      <div className={cn(
        "transition-all duration-300 ease-in-out overflow-hidden",
        hasOpenTabs ? "w-1/2" : "w-full"
      )}>
        {chatComponent}
      </div>

      {/* Right side - Viewer (50%) - Files or URLs */}
      {hasOpenTabs && (
        <div className="w-1/2 flex flex-col border-l border-slate-800/50 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/95 backdrop-blur-sm overflow-hidden">
          {/* Tabs with glassmorphism */}
          <div className="flex items-center bg-slate-900/30 backdrop-blur-md border-b border-slate-800/50 overflow-x-auto shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-900/5 via-transparent to-slate-700/5 pointer-events-none" />
            {openTabs.map((tab, index) => {
              const isActive = index === activeTabIndex;
              const Icon = tab.type === 'file' ? FileText : Globe;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabIndex(index)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2.5 text-sm border-r border-slate-800/30 whitespace-nowrap",
                    "transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-b from-slate-800/50 to-slate-900/50 text-slate-100 shadow-inner"
                      : "hover:bg-slate-800/20 text-slate-400 hover:text-slate-200"
                  )}
                >
                  {isActive && (
                    <>
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent pointer-events-none" />
                    </>
                  )}
                  <Icon className={cn(
                    "w-3.5 h-3.5 transition-colors",
                    isActive ? "text-orange-400" : "text-slate-500"
                  )} />
                  <span className={cn(
                    "font-medium",
                    tab.isDirty && "italic"
                  )}>
                    {tab.title}
                    {tab.isDirty && (
                      <span className="ml-1 text-orange-400">•</span>
                    )}
                  </span>
                  <button
                    onClick={(e) => closeTab(index, e)}
                    className={cn(
                      "ml-1 p-0.5 rounded-sm transition-all",
                      "hover:bg-red-500/20 hover:text-red-400",
                      "opacity-60 hover:opacity-100"
                    )}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </button>
              );
            })}
          </div>

          {/* Content - File Editor or Web Viewer */}
          <div className="flex-1 overflow-hidden relative">
            {activeTab && (
              activeTab.type === 'url' ? (
                <WebViewer url={activeTab.url!} title={activeTab.title} />
              ) : (
                <MonacoEditor
                  value={activeTab.content || ''}
                  path={activeTab.path!}
                  onChange={(value) => {
                    // Update tab content
                    setOpenTabs(prev => prev.map((tab, i) =>
                      i === activeTabIndex
                        ? { ...tab, content: value || '', isDirty: true }
                        : tab
                    ));
                    
                    // Also update corresponding file in openFiles
                    const fileIndex = openFiles.findIndex(f => f.path === activeTab.path);
                    if (fileIndex !== -1) {
                      handleFileChange(fileIndex, value);
                    }
                  }}
                  onSave={async () => {
                    // Find the corresponding file in openFiles and save it
                    const fileIndex = openFiles.findIndex(f => f.path === activeTab.path);
                    if (fileIndex !== -1) {
                      await handleFileSave(fileIndex);
                      // Update tab to mark as not dirty
                      setOpenTabs(prev => prev.map((tab, i) =>
                        i === activeTabIndex
                          ? { ...tab, isDirty: false }
                          : tab
                      ));
                    }
                  }}
                />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

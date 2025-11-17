"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export interface OpenFile {
  path: string;
  content: string;
  isDirty: boolean;
  language?: string;
}

export interface OpenTab {
  type: 'file' | 'url';
  id: string;
  title: string;
  // For files
  path?: string;
  content?: string;
  isDirty?: boolean;
  language?: string;
  // For URLs
  url?: string;
}

interface EditorContextType {
  openFiles: OpenFile[];
  activeFileIndex: number;
  activeFile: OpenFile | null;
  setOpenFiles: React.Dispatch<React.SetStateAction<OpenFile[]>>;
  setActiveFileIndex: React.Dispatch<React.SetStateAction<number>>;
  updateFileContent: (path: string, content: string) => void;
  // New tab-based system
  openTabs: OpenTab[];
  activeTabIndex: number;
  activeTab: OpenTab | null;
  setOpenTabs: React.Dispatch<React.SetStateAction<OpenTab[]>>;
  setActiveTabIndex: React.Dispatch<React.SetStateAction<number>>;
  openUrl: (url: string, title: string) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState<number>(0);

  const activeFile = openFiles[activeFileIndex] || null;
  const activeTab = openTabs[activeTabIndex] || null;

  const updateFileContent = useCallback((path: string, content: string) => {
    setOpenFiles(prev => prev.map(file =>
      file.path === path
        ? { ...file, content, isDirty: true }
        : file
    ));
  }, []);

  const openUrl = useCallback((url: string, title: string) => {
    // Check if URL is already open
    const existingIndex = openTabs.findIndex(tab => tab.type === 'url' && tab.url === url);
    if (existingIndex !== -1) {
      setActiveTabIndex(existingIndex);
      return;
    }

    // Create new URL tab
    const newTab: OpenTab = {
      type: 'url',
      id: `url-${Date.now()}`,
      title,
      url,
    };

    setOpenTabs(prev => [...prev, newTab]);
    setActiveTabIndex(openTabs.length);
  }, [openTabs]);

  return (
    <EditorContext.Provider
      value={{
        openFiles,
        activeFileIndex,
        activeFile,
        setOpenFiles,
        setActiveFileIndex,
        updateFileContent,
        openTabs,
        activeTabIndex,
        activeTab,
        setOpenTabs,
        setActiveTabIndex,
        openUrl,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
}

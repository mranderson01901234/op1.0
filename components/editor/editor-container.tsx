"use client";

import { SplitView } from "./split-view";
import { EnhancedChatInterface } from "../chat/enhanced-chat-interface";
import { EditorProvider } from "@/contexts/editor-context";
import { toast } from "sonner";

export function EditorContainer() {
  const handleFileRead = async (path: string): Promise<string> => {
    try {
      // Call the tool execution API to read the file
      const response = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'read_file',
          params: { path },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to read file');
      }

      return data.result.content || '';
    } catch (error: any) {
      console.error('Error reading file:', error);
      throw error;
    }
  };

  const handleFileSave = async (path: string, content: string): Promise<void> => {
    try {
      // Call the tool execution API to write the file
      const response = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'write_file',
          params: { path, content },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save file');
      }
    } catch (error: any) {
      console.error('Error saving file:', error);
      throw error;
    }
  };

  return (
    <EditorProvider>
      <SplitView
        chatComponent={<EnhancedChatInterface />}
        onFileRead={handleFileRead}
        onFileSave={handleFileSave}
      />
    </EditorProvider>
  );
}

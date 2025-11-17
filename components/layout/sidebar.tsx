"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Settings, MessageSquare, FolderOpen, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatPanel } from "./chat-panel";
import { FilesPanel } from "./files-panel";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "files">("chat");
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) {
      setCollapsed(JSON.parse(saved));
    }
  }, []);

  const toggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState));
  };

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 280 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col bg-gradient-sidebar",
          className
        )}
        style={{ borderRight: "1px solid rgba(255, 255, 255, 0.08)" }}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-center px-4" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
          {!collapsed ? (
            <h1 className="text-base font-semibold tracking-tighter">
              OperaStudio
            </h1>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white font-bold text-background">
              OS
            </div>
          )}
        </div>

        {/* Tabs - Segmented Control */}
        {!collapsed && (
          <div className="mx-2 mt-3 rounded-lg bg-surface p-1" role="tablist" aria-label="Sidebar navigation">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab("chat")}
                role="tab"
                aria-selected={activeTab === "chat"}
                aria-controls="chat-panel"
                aria-label="Chat conversations"
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
                  activeTab === "chat"
                    ? "bg-elevated text-white shadow-sm"
                    : "bg-transparent text-text-muted hover:bg-elevated-hover hover:text-text-secondary"
                )}
              >
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                <span>Chat</span>
              </button>
              <button
                onClick={() => setActiveTab("files")}
                role="tab"
                aria-selected={activeTab === "files"}
                aria-controls="files-panel"
                aria-label="File explorer"
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
                  activeTab === "files"
                    ? "bg-elevated text-white shadow-sm"
                    : "bg-transparent text-text-muted hover:bg-elevated-hover hover:text-text-secondary"
                )}
              >
                <FolderOpen className="h-4 w-4" aria-hidden="true" />
                <span>Files</span>
              </button>
            </div>
          </div>
        )}

        {/* New Chat Button - Always visible */}
        <div className="mx-2 mt-2 px-2">
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('new-chat'));
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
              "bg-elevated text-white hover:bg-elevated-hover",
              collapsed && "justify-center"
            )}
            aria-label="Start new chat"
          >
            <Plus className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>New Chat</span>}
          </button>
        </div>

        {/* Panel Content - Takes up remaining space */}
        <div className="flex-1 overflow-hidden">
          <div id="chat-panel" role="tabpanel" aria-labelledby="chat-tab" hidden={activeTab !== "chat"} className="h-full">
            {activeTab === "chat" && <ChatPanel collapsed={collapsed} />}
          </div>
          <div id="files-panel" role="tabpanel" aria-labelledby="files-tab" hidden={activeTab !== "files"} className="h-full">
            {activeTab === "files" && <FilesPanel collapsed={collapsed} />}
          </div>
        </div>

        {/* Footer - Sticky at bottom */}
        <div className="mt-auto p-2" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
          {!collapsed ? (
            <div className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 transition-all duration-150 hover:bg-gradient-hover">
              {/* Local Environment Status - Horizontal */}
              <div className="flex flex-1 items-center gap-2">
                <div className="relative">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      connected ? "bg-green-500" : "bg-gray-700"
                    )}
                  />
                  {connected && (
                    <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping opacity-75" />
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {connected ? "Connected" : "Disconnected"}
                </span>
              </div>

              {/* Settings Icon */}
              <button
                aria-label="Open settings"
                className="flex h-8 w-8 items-center justify-center rounded-lg opacity-60 transition-all duration-150 hover:bg-gray-900 hover:opacity-100"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {/* Connection status dot */}
              <div className="flex h-8 w-8 items-center justify-center">
                <div className="relative">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      connected ? "bg-green-500" : "bg-gray-700"
                    )}
                  />
                  {connected && (
                    <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping opacity-75" />
                  )}
                </div>
              </div>

              {/* Settings icon */}
              <button
                aria-label="Open settings"
                className="flex h-8 w-8 items-center justify-center rounded-lg opacity-60 transition-all duration-150 hover:bg-gray-900 hover:opacity-100"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {/* Collapse Button */}
        <button
          onClick={toggleCollapse}
          className={cn(
            "absolute -right-3 top-1/2 z-[51] flex h-6 w-6 -translate-y-1/2 items-center justify-center",
            "rounded-full bg-gray-900 transition-all duration-150",
            "hover:scale-110 hover:bg-gray-850"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-text-muted" />
          )}
        </button>
      </motion.aside>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem("sidebar-collapsed");
      if (saved) {
        setSidebarCollapsed(JSON.parse(saved));
      }
    };

    handleStorage();
    window.addEventListener("storage", handleStorage);

    // Poll for changes (for same-tab updates)
    const interval = setInterval(handleStorage, 100);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <main
        className={cn(
          "flex flex-1 h-screen flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          sidebarCollapsed ? "ml-16" : "ml-[280px]"
        )}
      >
        {children}
      </main>
    </div>
  );
}

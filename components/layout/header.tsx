"use client";

import { useState, useEffect } from "react";
import { AuthButtons } from "@/components/auth/auth-buttons";
import { cn } from "@/lib/utils";

export function Header() {
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
    <header 
      className={cn(
        "fixed top-0 right-0 z-40 flex h-16 items-center justify-end px-6 bg-background/80 backdrop-blur-sm transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        sidebarCollapsed ? "left-16" : "left-[280px]"
      )}
    >
      <AuthButtons />
    </header>
  );
}


"use client";

import { useEffect, useState } from "react";

interface ConditionalClerkProviderProps {
  children: React.ReactNode;
}

export function ConditionalClerkProvider({ children }: ConditionalClerkProviderProps) {
  const [ClerkProvider, setClerkProvider] = useState<React.ComponentType<{ children: React.ReactNode }> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Only load ClerkProvider if the key is available
    const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (clerkKey) {
      import("@clerk/nextjs")
        .then((mod) => {
          setClerkProvider(() => mod.ClerkProvider);
        })
        .catch(() => {
          // Silently fail if Clerk can't be loaded
          console.warn("Failed to load ClerkProvider");
        });
    }
  }, []);

  // During build or if no key, render without ClerkProvider
  if (!mounted || !ClerkProvider) {
    return <>{children}</>;
  }

  // Only render ClerkProvider when we have it loaded
  return <ClerkProvider>{children}</ClerkProvider>;
}


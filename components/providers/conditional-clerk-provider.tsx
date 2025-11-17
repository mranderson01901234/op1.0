"use client";

import { ClerkProvider } from "@clerk/nextjs";

interface ConditionalClerkProviderProps {
  children?: React.ReactNode;
}

/**
 * Conditional ClerkProvider wrapper
 * Follows official Clerk pattern: https://clerk.com/docs/quickstarts/nextjs
 * ClerkProvider handles configuration internally - no need to pass publishableKey
 */
export function ConditionalClerkProvider(props: ConditionalClerkProviderProps = {}) {
  const { children } = props || {};
  
  // Check if Clerk is configured via environment variable
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  // If no Clerk key, render without ClerkProvider
  if (!clerkKey) {
    return <>{children}</>;
  }

  // Render with ClerkProvider following official pattern
  // ClerkProvider reads publishableKey from NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY automatically
  return <ClerkProvider>{children}</ClerkProvider>;
}


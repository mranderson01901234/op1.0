"use client";

import { useUser } from "@clerk/nextjs";
import { ConditionalSignedIn, ConditionalSignedOut } from "./conditional-clerk-components";
import { AuthModal } from "./auth-modal";
import { useState, useEffect } from "react";
import { LogIn } from "lucide-react";

interface ProtectedChatProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that protects chat features behind authentication
 * Shows sign-in prompt for unauthenticated users
 * If Clerk is not configured, allows access (for development/testing)
 */
export function ProtectedChat({ children }: ProtectedChatProps) {
  const { isSignedIn, isLoaded } = useUser();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  
  // Check if Clerk is configured
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isClerkConfigured = !!clerkKey;

  // Auto-open sign-in modal if user is not signed in and Clerk is loaded
  useEffect(() => {
    if (isClerkConfigured && isLoaded && !isSignedIn) {
      setAuthModalOpen(true);
    }
  }, [isClerkConfigured, isLoaded, isSignedIn]);
  
  // If Clerk is not configured, allow access (for development/testing)
  if (!isClerkConfigured) {
    return <>{children}</>;
  }

  return (
    <>
      <ConditionalSignedOut>
        <div className="flex h-full w-full flex-col items-center justify-center px-8">
          <div className="mx-auto max-w-md text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-elevated">
                <LogIn className="h-8 w-8 text-text-secondary" />
              </div>
            </div>
            <h2 className="mb-3 text-2xl font-semibold text-text-primary">
              Sign in to continue
            </h2>
            <p className="mb-8 text-text-secondary">
              Please sign in to use OperaStudio chat features and access your local environment.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setAuthMode("sign-in");
                  setAuthModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 rounded-lg bg-elevated px-6 py-3 text-sm font-medium text-white transition-all duration-150 hover:bg-elevated-hover"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </button>
              <button
                onClick={() => {
                  setAuthMode("sign-up");
                  setAuthModalOpen(true);
                }}
                className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-surface px-6 py-3 text-sm font-medium text-white transition-all duration-150 hover:bg-elevated-hover"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </ConditionalSignedOut>

      <ConditionalSignedIn>
        {children}
      </ConditionalSignedIn>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onModeChange={(newMode) => setAuthMode(newMode)}
      />
    </>
  );
}


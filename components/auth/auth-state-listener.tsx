"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { clearAllUserData } from "@/lib/storage";

/**
 * Component that listens to Clerk authentication state changes
 * and clears localStorage data when users sign out
 * 
 * This ensures complete user data sanitation between users, browsers, and accounts
 */
export function AuthStateListener() {
  // Check if Clerk is configured
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  // If Clerk is not configured, don't do anything
  if (!clerkKey) {
    return null;
  }

  // Use Clerk's useUser hook - it will return safe defaults if ClerkProvider is not available
  const { isSignedIn, isLoaded, user } = useUser();
  const previousSignedInStateRef = useRef<boolean | null>(null);
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Wait for Clerk to finish loading
    if (!isLoaded) return;

    const wasSignedIn = previousSignedInStateRef.current;
    const previousUserId = previousUserIdRef.current;
    const currentUserId = user?.id || null;

    // Detect sign-out: user was signed in but now is not
    if (wasSignedIn === true && !isSignedIn) {
      console.log("User signed out - clearing all chat data");
      clearAllUserData();
      // Reset refs
      previousSignedInStateRef.current = false;
      previousUserIdRef.current = null;
      return;
    }

    // Detect user switch: user ID changed (different user signed in)
    if (
      wasSignedIn === true &&
      isSignedIn &&
      previousUserId !== null &&
      currentUserId !== null &&
      previousUserId !== currentUserId
    ) {
      console.log("User switched - clearing previous user's chat data");
      clearAllUserData();
      // Update refs to new user
      previousSignedInStateRef.current = true;
      previousUserIdRef.current = currentUserId;
      return;
    }

    // Update refs for next check
    if (isLoaded) {
      previousSignedInStateRef.current = isSignedIn;
      if (user?.id) {
        previousUserIdRef.current = user.id;
      }
    }
  }, [isSignedIn, isLoaded, user?.id]);

  // This component doesn't render anything
  return null;
}


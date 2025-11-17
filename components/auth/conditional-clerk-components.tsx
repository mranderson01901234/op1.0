"use client";

import { SignedOut, SignedIn, UserButton, SignIn, SignUp, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

// Conditional wrapper components that only render Clerk components when ClerkProvider is available

interface ConditionalSignedOutProps {
  children?: React.ReactNode;
}

export function ConditionalSignedOut(props: ConditionalSignedOutProps = {}) {
  const { children } = props || {};
  const [mounted, setMounted] = useState(false);
  const { isLoaded } = useUser();
  
  // Check if Clerk is configured
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // If Clerk is not configured, always show children (assume signed out)
  if (!clerkKey) {
    return <>{children}</>;
  }

  // During SSR or before Clerk loads, return null to match client initial state
  if (typeof window === 'undefined' || !mounted || !isLoaded) {
    return null;
  }

  // Use Clerk's SignedOut component directly following official pattern
  return <SignedOut>{children}</SignedOut>;
}

interface ConditionalSignedInProps {
  children?: React.ReactNode;
}

export function ConditionalSignedIn(props: ConditionalSignedInProps = {}) {
  const { children } = props || {};
  const [mounted, setMounted] = useState(false);
  const { isLoaded } = useUser();
  
  // Check if Clerk is configured
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // If Clerk is not configured, don't show signed in content
  if (!clerkKey) {
    return null;
  }

  // During SSR or before Clerk loads, return null to match client initial state
  if (typeof window === 'undefined' || !mounted || !isLoaded) {
    return null;
  }

  // Use Clerk's SignedIn component directly following official pattern
  return <SignedIn>{children}</SignedIn>;
}

interface ConditionalUserButtonProps {
  appearance?: Record<string, unknown>;
}

export function ConditionalUserButton({ appearance }: ConditionalUserButtonProps) {
  const [mounted, setMounted] = useState(false);
  const { isLoaded } = useUser();
  
  // Check if Clerk is configured
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // If Clerk is not configured, don't show user button
  if (!clerkKey) {
    return null;
  }

  // During SSR or before Clerk loads, return null to match client initial state
  if (typeof window === 'undefined' || !mounted || !isLoaded) {
    return null;
  }

  // Use Clerk's UserButton component directly following official pattern
  return <UserButton appearance={appearance} />;
}

interface ConditionalSignInProps {
  routing?: "virtual" | "hash";
  appearance?: Record<string, unknown>;
}

export function ConditionalSignIn({ routing, appearance }: ConditionalSignInProps) {
  // Check if Clerk is configured
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  // If Clerk is not configured, show message
  if (!clerkKey) {
    return (
      <div className="p-6 text-center text-text-secondary">
        Clerk authentication is not configured. Please set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
      </div>
    );
  }

  // Use Clerk's SignIn component directly following official pattern
  return <SignIn routing={routing} appearance={appearance} />;
}

interface ConditionalSignUpProps {
  routing?: "virtual" | "hash";
  appearance?: Record<string, unknown>;
}

export function ConditionalSignUp({ routing, appearance }: ConditionalSignUpProps) {
  // Check if Clerk is configured
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  // If Clerk is not configured, show message
  if (!clerkKey) {
    return (
      <div className="p-6 text-center text-text-secondary">
        Clerk authentication is not configured. Please set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
      </div>
    );
  }

  // Use Clerk's SignUp component directly following official pattern
  return <SignUp routing={routing} appearance={appearance} />;
}


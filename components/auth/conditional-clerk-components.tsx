"use client";

import { useEffect, useState } from "react";

// Conditional wrapper components that only render Clerk components when ClerkProvider is available

interface ConditionalSignedOutProps {
  children: React.ReactNode;
}

export function ConditionalSignedOut({ children }: ConditionalSignedOutProps) {
  const [ClerkSignedOut, setClerkSignedOut] = useState<React.ComponentType<{ children: React.ReactNode }> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (clerkKey) {
      import("@clerk/nextjs")
        .then((mod) => {
          setClerkSignedOut(() => mod.SignedOut);
        })
        .catch(() => {
          // Silently fail if Clerk can't be loaded
        });
    }
  }, []);

  if (!mounted || !ClerkSignedOut) {
    // If Clerk is not available, always show children (assume signed out)
    return <>{children}</>;
  }

  return <ClerkSignedOut>{children}</ClerkSignedOut>;
}

interface ConditionalSignedInProps {
  children: React.ReactNode;
}

export function ConditionalSignedIn({ children }: ConditionalSignedInProps) {
  const [ClerkSignedIn, setClerkSignedIn] = useState<React.ComponentType<{ children: React.ReactNode }> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (clerkKey) {
      import("@clerk/nextjs")
        .then((mod) => {
          setClerkSignedIn(() => mod.SignedIn);
        })
        .catch(() => {
          // Silently fail if Clerk can't be loaded
        });
    }
  }, []);

  if (!mounted || !ClerkSignedIn) {
    // If Clerk is not available, don't show signed in content
    return null;
  }

  return <ClerkSignedIn>{children}</ClerkSignedIn>;
}

interface ConditionalUserButtonProps {
  appearance?: any;
}

export function ConditionalUserButton({ appearance }: ConditionalUserButtonProps) {
  const [ClerkUserButton, setClerkUserButton] = useState<React.ComponentType<{ appearance?: any }> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (clerkKey) {
      import("@clerk/nextjs")
        .then((mod) => {
          setClerkUserButton(() => mod.UserButton);
        })
        .catch(() => {
          // Silently fail if Clerk can't be loaded
        });
    }
  }, []);

  if (!mounted || !ClerkUserButton) {
    return null;
  }

  return <ClerkUserButton appearance={appearance} />;
}

interface ConditionalSignInProps {
  routing?: string;
  appearance?: any;
}

export function ConditionalSignIn({ routing, appearance }: ConditionalSignInProps) {
  const [ClerkSignIn, setClerkSignIn] = useState<React.ComponentType<{ routing?: string; appearance?: any }> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (clerkKey) {
      import("@clerk/nextjs")
        .then((mod) => {
          setClerkSignIn(() => mod.SignIn);
        })
        .catch(() => {
          // Silently fail if Clerk can't be loaded
        });
    }
  }, []);

  if (!mounted || !ClerkSignIn) {
    return (
      <div className="p-6 text-center text-text-secondary">
        Clerk authentication is not configured. Please set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
      </div>
    );
  }

  return <ClerkSignIn routing={routing} appearance={appearance} />;
}

interface ConditionalSignUpProps {
  routing?: string;
  appearance?: any;
}

export function ConditionalSignUp({ routing, appearance }: ConditionalSignUpProps) {
  const [ClerkSignUp, setClerkSignUp] = useState<React.ComponentType<{ routing?: string; appearance?: any }> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (clerkKey) {
      import("@clerk/nextjs")
        .then((mod) => {
          setClerkSignUp(() => mod.SignUp);
        })
        .catch(() => {
          // Silently fail if Clerk can't be loaded
        });
    }
  }, []);

  if (!mounted || !ClerkSignUp) {
    return (
      <div className="p-6 text-center text-text-secondary">
        Clerk authentication is not configured. Please set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
      </div>
    );
  }

  return <ClerkSignUp routing={routing} appearance={appearance} />;
}


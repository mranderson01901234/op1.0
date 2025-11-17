"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import { AuthModal } from "./auth-modal";

export function AuthButtons() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");

  const openSignIn = () => {
    setAuthMode("sign-in");
    setAuthModalOpen(true);
  };

  const openSignUp = () => {
    setAuthMode("sign-up");
    setAuthModalOpen(true);
  };

  return (
    <>
      <SignedOut>
        <div className="flex items-center gap-2">
          <button
            onClick={openSignIn}
            className="flex items-center gap-2 rounded-lg bg-elevated px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-elevated-hover"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </button>
          <button
            onClick={openSignUp}
            className="flex items-center gap-2 rounded-lg bg-surface border border-[rgba(255,255,255,0.08)] px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-elevated-hover"
          >
            <UserPlus className="h-4 w-4" />
            Sign Up
          </button>
        </div>
      </SignedOut>
      
      <SignedIn>
        <UserButton 
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
              userButtonPopoverCard: "bg-elevated border border-[rgba(255,255,255,0.08)] shadow-2xl",
              userButtonPopoverMain: "bg-elevated",
              userButtonPopoverActions: "bg-elevated",
              userButtonPopoverActionButton: "bg-transparent text-white hover:bg-elevated-hover border-none",
              userButtonPopoverActionButtonText: "text-white",
              userButtonPopoverActionButtonIcon: "text-text-secondary",
              userButtonPopoverFooter: "hidden",
              userButtonPopoverHeader: "bg-elevated",
              userButtonPopoverHeaderBox: "bg-elevated",
              userPreview: "bg-elevated",
              userPreviewTextContainer: "bg-elevated",
              userPreviewMainIdentifier: "text-white",
              userPreviewSecondaryIdentifier: "text-text-secondary",
              userButtonPopoverAvatarBox: "bg-surface",
              card: "bg-elevated",
              cardBox: "bg-elevated",
            },
            baseTheme: "dark",
            variables: {
              colorBackground: "#1a1a1a",
              colorText: "#ffffff",
              colorTextSecondary: "#a0a0a0",
              colorInputBackground: "#141414",
              colorInputText: "#ffffff",
            },
          }}
        />
      </SignedIn>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onModeChange={(newMode) => setAuthMode(newMode)}
      />
    </>
  );
}


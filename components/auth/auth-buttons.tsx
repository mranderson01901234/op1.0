"use client";

import { LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import { AuthModal } from "./auth-modal";
import { ConditionalSignedIn, ConditionalSignedOut, ConditionalUserButton } from "./conditional-clerk-components";

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
    <div>
      {/* Hide auth buttons for unauthenticated users - main content has sign-in prompt */}
      <ConditionalSignedOut>
        {/* Empty - no buttons shown in header for unauthenticated users */}
      </ConditionalSignedOut>
      
      <ConditionalSignedIn>
        <ConditionalUserButton 
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
            variables: {
              colorBackground: "#1a1a1a",
              colorText: "#ffffff",
              colorTextSecondary: "#a0a0a0",
              colorInputBackground: "#141414",
              colorInputText: "#ffffff",
            },
          }}
        />
      </ConditionalSignedIn>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onModeChange={(newMode) => setAuthMode(newMode)}
      />
    </div>
  );
}


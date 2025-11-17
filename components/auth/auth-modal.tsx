"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ConditionalSignIn, ConditionalSignUp } from "./conditional-clerk-components";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "sign-in" | "sign-up";
  onModeChange?: (mode: "sign-in" | "sign-up") => void;
}

export function AuthModal({ isOpen, onClose, mode, onModeChange }: AuthModalProps) {
  const [currentMode, setCurrentMode] = useState(mode);
  const [mounted, setMounted] = useState(false);
  const lastPathnameRef = useRef(window.location.pathname);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  // Intercept Clerk's internal navigation to keep everything in modal
  useEffect(() => {
    if (!isOpen) return;

    // Intercept clicks on footer links that would navigate to /sign-in or /sign-up
    const interceptNavigation = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href*="/sign"]') as HTMLAnchorElement;
      
      if (link) {
        const href = link.getAttribute('href') || '';
        
        // Prevent navigation to /sign-in or /sign-up pages
        if (href.includes('/sign-up') || href.includes('/signup')) {
          e.preventDefault();
          e.stopPropagation();
          if (currentMode !== "sign-up") {
            setCurrentMode("sign-up");
            onModeChange?.("sign-up");
          }
          return false;
        } else if (href.includes('/sign-in') || href.includes('/signin')) {
          e.preventDefault();
          e.stopPropagation();
          if (currentMode !== "sign-in") {
            setCurrentMode("sign-in");
            onModeChange?.("sign-in");
          }
          return false;
        }
      }
    };

    const handleHashChange = () => {
      const hash = window.location.hash;
      // Check for sign-up in hash
      if (hash.includes("sign-up") && currentMode !== "sign-up") {
        setCurrentMode("sign-up");
        onModeChange?.("sign-up");
      } 
      // Check for sign-in in hash (or if hash is empty/doesn't contain sign-up)
      else if ((hash.includes("sign-in") || (!hash.includes("sign-up") && hash !== "")) && currentMode !== "sign-in") {
        setCurrentMode("sign-in");
        onModeChange?.("sign-in");
      }
    };

    // Intercept Next.js router navigation
    const handlePopState = (e: PopStateEvent) => {
      const path = window.location.pathname;
      if (path.includes('/sign-up') || path.includes('/signup')) {
        e.preventDefault();
        window.history.pushState(null, '', window.location.pathname);
        if (currentMode !== "sign-up") {
          setCurrentMode("sign-up");
          onModeChange?.("sign-up");
        }
      } else if (path.includes('/sign-in') || path.includes('/signin')) {
        e.preventDefault();
        window.history.pushState(null, '', window.location.pathname);
        if (currentMode !== "sign-in") {
          setCurrentMode("sign-in");
          onModeChange?.("sign-in");
        }
      }
    };

    // Monitor pathname changes to catch any navigation
    const checkPathname = () => {
      const currentPathname = window.location.pathname;
      if (currentPathname !== lastPathnameRef.current) {
        lastPathnameRef.current = currentPathname;
        if (currentPathname.includes('/sign-up') || currentPathname.includes('/signup')) {
          // Prevent navigation and switch modal mode
          window.history.replaceState(null, '', '/');
          if (currentMode !== "sign-up") {
            setCurrentMode("sign-up");
            onModeChange?.("sign-up");
          }
        } else if (currentPathname.includes('/sign-in') || currentPathname.includes('/signin')) {
          // Prevent navigation and switch modal mode
          window.history.replaceState(null, '', '/');
          if (currentMode !== "sign-in") {
            setCurrentMode("sign-in");
            onModeChange?.("sign-in");
          }
        }
      }
    };

    // Listen for clicks on links
    document.addEventListener('click', interceptNavigation, true);
    
    // Listen for hash changes (Clerk uses hash routing)
    window.addEventListener("hashchange", handleHashChange);
    
    // Listen for browser navigation
    window.addEventListener("popstate", handlePopState);
    
    // Also check on mount and periodically to catch any navigation
    handleHashChange();
    checkPathname();
    const interval = setInterval(() => {
      handleHashChange();
      checkPathname();
    }, 100);

    return () => {
      document.removeEventListener('click', interceptNavigation, true);
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handlePopState);
      clearInterval(interval);
    };
  }, [isOpen, currentMode, onModeChange]);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            style={{ top: 0, left: 0, right: 0, bottom: 0 }}
          />
          
          {/* Modal - Centered globally on all four sides */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            style={{ 
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              margin: 0,
              position: "fixed"
            }}
            onClick={(e) => {
              // Close modal when clicking backdrop
              if (e.target === e.currentTarget) {
                onClose();
              }
            }}
          >
            <div className="relative w-full max-w-md rounded-lg bg-elevated shadow-2xl" style={{ border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-text-muted transition-all duration-150 hover:bg-elevated-hover hover:text-white"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
              
              {/* Clerk Component */}
              <div className="p-6 pt-12">
                {currentMode === "sign-in" ? (
                  <ConditionalSignIn 
                    routing="virtual"
                    appearance={{
                      elements: {
                        rootBox: "mx-auto",
                        card: "bg-transparent shadow-none border-none",
                        headerTitle: "text-white",
                        headerSubtitle: "text-text-secondary",
                        socialButtonsBlockButton: "bg-surface border border-[rgba(255,255,255,0.08)] text-white hover:bg-elevated-hover",
                        formButtonPrimary: "bg-surface border border-[rgba(255,255,255,0.08)] text-white hover:bg-elevated-hover hover:border-[rgba(255,255,255,0.12)]",
                        formFieldInput: "bg-surface border-[rgba(255,255,255,0.08)] text-white placeholder:text-text-muted focus:border-[rgba(255,255,255,0.12)] focus:bg-elevated",
                        formFieldInputShowPasswordButton: "text-text-secondary hover:text-white",
                        formFieldLabel: "text-text-secondary",
                        footerActionLink: "text-white hover:text-gray-200 cursor-pointer",
                        footer: "bg-transparent",
                        footerPages: "text-text-secondary",
                        identityPreviewText: "text-white",
                        identityPreviewEditButton: "text-white hover:text-gray-200",
                        formResendCodeLink: "text-white hover:text-gray-200",
                        otpCodeFieldInput: "bg-surface border-[rgba(255,255,255,0.08)] text-white",
                        formFieldSuccessText: "text-green-400",
                        formFieldErrorText: "text-red-400",
                      },
                      variables: {
                        colorInputText: "#ffffff",
                        colorInputBackground: "#141414",
                        colorPrimary: "#ffffff",
                        colorText: "#ffffff",
                        colorTextSecondary: "#a0a0a0",
                        colorBackground: "#1a1a1a",
                      },
                    }}
                  />
                ) : (
                  <ConditionalSignUp
                    routing="virtual"
                    appearance={{
                      elements: {
                        rootBox: "mx-auto",
                        card: "bg-transparent shadow-none border-none",
                        headerTitle: "text-white",
                        headerSubtitle: "text-text-secondary",
                        socialButtonsBlockButton: "bg-surface border border-[rgba(255,255,255,0.08)] text-white hover:bg-elevated-hover",
                        formButtonPrimary: "bg-surface border border-[rgba(255,255,255,0.08)] text-white hover:bg-elevated-hover hover:border-[rgba(255,255,255,0.12)]",
                        formFieldInput: "bg-surface border-[rgba(255,255,255,0.08)] text-white placeholder:text-text-muted focus:border-[rgba(255,255,255,0.12)] focus:bg-elevated",
                        formFieldInputShowPasswordButton: "text-text-secondary hover:text-white",
                        formFieldLabel: "text-text-secondary",
                        footerActionLink: "text-white hover:text-gray-200 cursor-pointer",
                        footer: "bg-transparent",
                        footerPages: "text-text-secondary",
                        identityPreviewText: "text-white",
                        identityPreviewEditButton: "text-white hover:text-gray-200",
                        formResendCodeLink: "text-white hover:text-gray-200",
                        otpCodeFieldInput: "bg-surface border-[rgba(255,255,255,0.08)] text-white",
                        formFieldSuccessText: "text-green-400",
                        formFieldErrorText: "text-red-400",
                      },
                      variables: {
                        colorInputText: "#ffffff",
                        colorInputBackground: "#141414",
                        colorPrimary: "#ffffff",
                        colorText: "#ffffff",
                        colorTextSecondary: "#a0a0a0",
                        colorBackground: "#1a1a1a",
                      },
                    }}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Render modal to document body using portal to avoid parent positioning constraints
  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}


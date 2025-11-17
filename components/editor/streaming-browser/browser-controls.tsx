"use client";

import { useState, useEffect, useRef } from 'react';
import { X, ArrowLeft, ArrowRight, RefreshCw, Home, Wifi, WifiOff } from 'lucide-react';

interface BrowserControlsProps {
  url: string;
  title: string;
  onNavigate: (url: string) => void;
  onClose: () => void;
  isConnected: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
  onReload?: () => void;
}

export function BrowserControls({ url, title, onNavigate, onClose, isConnected, onGoBack, onGoForward, onReload }: BrowserControlsProps) {
  const [urlInput, setUrlInput] = useState(url);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update URL input when URL changes externally
  useEffect(() => {
    setUrlInput(url);
  }, [url]);

  // Focus URL bar on Cmd+L
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        setIsEditing(true);
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 0);
      }

      // Refresh on Cmd+R
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    if (urlInput.trim()) {
      onNavigate(urlInput.trim());
    } else {
      setUrlInput(url); // Reset if empty
    }
  };

  const handleUrlBlur = () => {
    setIsEditing(false);
    setUrlInput(url); // Reset to current URL
  };

  const handleRefresh = () => {
    if (onReload) {
      onReload();
    } else if (url && url !== 'about:blank') {
      onNavigate(url);
    }
  };

  const handleHome = () => {
    onNavigate('https://google.com');
  };

  const handleBack = () => {
    if (onGoBack) {
      onGoBack();
    }
  };

  const handleForward = () => {
    if (onGoForward) {
      onGoForward();
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-900/30 backdrop-blur-md border-b border-slate-800/50">
      {/* Left side - Navigation buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleBack}
          disabled={!isConnected}
          className="p-1.5 hover:bg-slate-800/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Back"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400" />
        </button>
        <button
          onClick={handleForward}
          disabled={!isConnected}
          className="p-1.5 hover:bg-slate-800/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Forward"
        >
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </button>
        <button
          onClick={handleRefresh}
          disabled={!isConnected}
          className="p-1.5 hover:bg-slate-800/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh (Cmd+R)"
        >
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
        <button
          onClick={handleHome}
          disabled={!isConnected}
          className="p-1.5 hover:bg-slate-800/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Home"
        >
          <Home className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Center - URL bar */}
      <div className="flex-1 mx-4">
        {isEditing ? (
          <form onSubmit={handleUrlSubmit} className="w-full">
            <input
              ref={inputRef}
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onBlur={handleUrlBlur}
              className="w-full px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500/50"
              placeholder="Enter URL or search..."
            />
          </form>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded text-sm text-slate-400 hover:bg-slate-800/70 transition-colors text-left truncate"
            title={url || title || 'Click to enter URL'}
          >
            {url || 'Enter URL...'}
          </button>
        )}
      </div>

      {/* Right side - Connection status and close */}
      <div className="flex items-center gap-2">
        {isConnected ? (
          <div title="Connected">
            <Wifi className="w-4 h-4 text-green-400" />
          </div>
        ) : (
          <div title="Disconnected">
            <WifiOff className="w-4 h-4 text-yellow-400" />
          </div>
        )}
        <button
          onClick={onClose}
          className="p-1 hover:bg-red-500/20 rounded transition-colors"
          title="Close"
        >
          <X className="w-4 h-4 text-slate-400 hover:text-red-400" />
        </button>
      </div>
    </div>
  );
}


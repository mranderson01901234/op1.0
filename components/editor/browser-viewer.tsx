"use client";

import { ExternalLink, RefreshCw, AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import React from "react";

interface BrowserViewerProps {
  url: string;
  title: string;
}

const STREAM_SERVER_URL = 'ws://localhost:8083';
const STREAM_SESSION_URL = 'http://localhost:8083/session';

export function BrowserViewer({ url, title }: BrowserViewerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [currentTitle, setCurrentTitle] = useState(title);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevUrlRef = React.useRef<string | null>(null);
  const frameBufferRef = useRef<{ header: any; data: Blob | null } | null>(null);
  const navigationInProgressRef = useRef<boolean>(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingNavigationRef = useRef<string | null>(null);
  const frameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const currentUrlRef = useRef<string>(url); // Track current URL in ref for navigation comparison

  // Get session token
  const getSessionToken = useCallback(async () => {
    try {
      const response = await fetch(STREAM_SESSION_URL);
      if (!response.ok) {
        throw new Error('Failed to get session token');
      }
      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('[BrowserViewer] Failed to get session token:', error);
      throw error;
    }
  }, []);

  // Navigate to URL (defined early so connect can use it)
  const navigateToUrl = useCallback((targetUrl: string) => {
    console.log('[BrowserViewer] navigateToUrl called:', { 
      targetUrl, 
      currentUrl: currentUrlRef.current,
      navigationInProgress: navigationInProgressRef.current,
      wsReady: wsRef.current?.readyState === WebSocket.OPEN
    });

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[BrowserViewer] Cannot navigate: not connected, storing for later');
      pendingNavigationRef.current = targetUrl;
      return;
    }

    // Normalize URLs for comparison (remove trailing slashes, lowercase, etc.)
    const normalizeUrl = (u: string) => {
      try {
        const urlObj = new URL(u);
        // Remove trailing slash from pathname
        const pathname = urlObj.pathname.replace(/\/$/, '') || '/';
        return `${urlObj.protocol}//${urlObj.host}${pathname}${urlObj.search}${urlObj.hash}`;
      } catch {
        return u.toLowerCase().replace(/\/$/, '');
      }
    };

    const normalizedCurrent = normalizeUrl(currentUrlRef.current);
    const normalizedTarget = normalizeUrl(targetUrl);

    // If navigation is in progress but URL is different, cancel previous and start new
    if (navigationInProgressRef.current && normalizedCurrent !== normalizedTarget) {
      console.log('[BrowserViewer] Cancelling previous navigation, starting new:', { 
        previous: normalizedCurrent, 
        new: normalizedTarget 
      });
      // Clear previous navigation timeout
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
      navigationInProgressRef.current = false;
    }

    // Prevent multiple simultaneous navigations to the same URL
    if (navigationInProgressRef.current && normalizedCurrent === normalizedTarget) {
      console.log('[BrowserViewer] Navigation already in progress to same URL, skipping:', normalizedTarget);
      return;
    }

    // Clear any pending navigation timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }

    navigationInProgressRef.current = true;
    setIsLoading(true);
    setHasError(false);
    setErrorMessage(null);

    const requestId = `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('[BrowserViewer] ✅ Sending navigation request:', { 
      url: targetUrl, 
      requestId,
      previousUrl: currentUrlRef.current,
      navigationInProgress: navigationInProgressRef.current
    });
    
    // Don't update currentUrlRef here - wait for server response which may include redirects/normalization
    // This prevents comparison issues if server returns a different URL
    
    wsRef.current.send(JSON.stringify({
      type: 'navigate',
      url: targetUrl,
      request_id: requestId
    }));

    // Set timeout to clear navigation flag if no response received
    navigationTimeoutRef.current = setTimeout(() => {
      console.warn('[BrowserViewer] Navigation timeout, clearing flag');
      navigationInProgressRef.current = false;
    }, 10000); // 10 second timeout
  }, []);

  // Connect to stream server
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      // Get session token
      const token = await getSessionToken();
      setSessionToken(token);

      // Connect to WebSocket
      const wsUrl = `${STREAM_SERVER_URL}?token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[BrowserViewer] ✅ Connected to stream server');
        setIsConnected(true);
        setHasError(false);
        setErrorMessage(null);
        setIsLoading(true); // Keep loading until first frame arrives
        
        // Navigate to URL after connection (with delay to ensure connection is ready and page context is stable)
        // Use pendingNavigationRef if URL changed during connection, otherwise use currentUrl from state
        // Access currentUrl via closure - it will be the value at connection time
        const urlToNavigate = pendingNavigationRef.current || url;
        if (urlToNavigate) {
          pendingNavigationRef.current = null;
          setTimeout(() => {
            console.log('[BrowserViewer] Navigating to:', urlToNavigate);
            navigateToUrl(urlToNavigate);
          }, 500); // Increased delay to ensure page context is ready
        }
      };

      ws.onmessage = (event) => {
        try {
          // Stream server sends: JSON header Buffer (small, < 200 bytes) + binary frame data (large, > 10KB)
          // Use size to distinguish header from frame
          
          let dataSize: number;
          let data: Blob | ArrayBuffer | string;
          
          // Log message type for debugging
          const msgType = typeof event.data;
          const isBlob = event.data instanceof Blob;
          const isArrayBuffer = event.data instanceof ArrayBuffer;
          
          if (isBlob) {
            dataSize = event.data.size;
            data = event.data;
            console.log('[BrowserViewer] 📨 Received Blob message:', { size: dataSize });
          } else if (isArrayBuffer) {
            dataSize = event.data.byteLength;
            data = event.data;
            console.log('[BrowserViewer] 📨 Received ArrayBuffer message:', { size: dataSize });
          } else if (typeof event.data === 'string') {
            // String message (control message)
            console.log('[BrowserViewer] 📨 Received String message:', event.data.substring(0, 100));
            const message = JSON.parse(event.data);
            handleControlMessage(message);
            return;
          } else {
            console.warn('[BrowserViewer] Unknown message type:', msgType, 'constructor:', event.data?.constructor?.name);
            // Try to handle as Blob/ArrayBuffer anyway
            if (event.data && typeof (event.data as any).size === 'number') {
              dataSize = (event.data as any).size;
              data = event.data as Blob;
              console.log('[BrowserViewer] Treating as Blob-like:', { size: dataSize });
            } else {
              return;
            }
          }
          
          // Small message (< 500 bytes) = likely header
          if (dataSize < 500) {
            // Try to parse as JSON header
            const blob = data instanceof Blob ? data : new Blob([data]);
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const text = reader.result as string;
                const message = JSON.parse(text.trim());
                
                if (message.type === 'frame') {
                  frameBufferRef.current = { header: message, data: null };
                  console.log('[BrowserViewer] Frame header received, waiting for binary data');
                } else {
                  handleControlMessage(message);
                }
              } catch (e) {
                console.warn('[BrowserViewer] Failed to parse small message as JSON:', e);
              }
            };
            reader.readAsText(blob);
          } else {
            // Large message = frame data
            console.log('[BrowserViewer] 📦 Received binary data (likely frame):', { 
              size: dataSize, 
              hasHeader: !!frameBufferRef.current,
              type: data instanceof Blob ? 'Blob' : 'ArrayBuffer'
            });
            
            if (frameBufferRef.current) {
              // We have a header, this is the frame
              console.log('[BrowserViewer] ✅ Processing frame with header');
              const blob = data instanceof Blob ? data : new Blob([data]);
              frameBufferRef.current.data = blob;
              handleFrame(frameBufferRef.current.data);
              frameBufferRef.current = null;
            } else {
              // No header, but large data - might be a frame anyway
              console.log('[BrowserViewer] ⚠️ Received large data without header, treating as frame');
              const blob = data instanceof Blob ? data : new Blob([data]);
              handleFrame(blob);
            }
          }
        } catch (error) {
          console.error('[BrowserViewer] Error handling message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[BrowserViewer] WebSocket error:', error);
        setHasError(true);
        setErrorMessage('Connection error. Is the Electron browser running?');
      };

      ws.onclose = () => {
        console.log('[BrowserViewer] WebSocket closed');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect after 2 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[BrowserViewer] Attempting to reconnect...');
          connect();
        }, 2000);
      };
    } catch (error: any) {
      console.error('[BrowserViewer] Connection error:', error);
      setHasError(true);
      setErrorMessage(error.message || 'Failed to connect to browser stream');
      setIsLoading(false);
    }
  }, [getSessionToken, navigateToUrl, url]); // Added navigateToUrl and url (prop) dependencies

  // Handle control messages from stream server
  const handleControlMessage = useCallback((message: any) => {
    console.log('[BrowserViewer] Control message:', message.type);
    
    if (message.type === 'connected') {
      console.log('[BrowserViewer] Stream server confirmed connection, waiting for frames...');
      // Keep loading until first frame arrives
      // Request frames after connection - send multiple triggers
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('[BrowserViewer] Requesting frames after connection');
        
        const triggerFrame = () => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'mouse_move',
              x: Math.random() * 10 + 1,
              y: Math.random() * 10 + 1,
              viewportWidth: 1280,
              viewportHeight: 720
            }));
          }
        };
        
        // Trigger multiple times to ensure frames start
        triggerFrame();
        setTimeout(triggerFrame, 100);
        setTimeout(triggerFrame, 300);
      }
      // Set timeout to clear loading if no frames arrive
      if (frameTimeoutRef.current) {
        clearTimeout(frameTimeoutRef.current);
      }
      frameTimeoutRef.current = setTimeout(() => {
        console.warn('[BrowserViewer] No frames received after connection, clearing loading state');
        setIsLoading(false);
        frameTimeoutRef.current = null;
      }, 10000); // 10 second timeout for frames
    } else if (message.type === 'url_updated') {
      console.log('[BrowserViewer] URL updated:', message.url);
      setCurrentUrl(message.url);
      currentUrlRef.current = message.url; // Update ref
      setCurrentTitle(message.title || title);
      setIsLoading(true); // Show loading while new page loads
    } else if (message.type === 'error') {
      const errorMsg = message.message || 'Browser error';
      console.error('[BrowserViewer] Browser error:', errorMsg);
      
      // Handle "Execution context was destroyed" error gracefully - this is often benign
      // and happens when navigation occurs while another operation is in progress
      if (errorMsg.includes('Execution context was destroyed') || 
          errorMsg.includes('navigation')) {
        console.warn('[BrowserViewer] Navigation context error (likely benign, retrying):', errorMsg);
        // Don't show error to user, just log it and clear navigation flag
        navigationInProgressRef.current = false;
        // If there's a pending navigation, retry it
        if (pendingNavigationRef.current) {
          const urlToRetry = pendingNavigationRef.current;
          pendingNavigationRef.current = null;
          setTimeout(() => {
            navigateToUrl(urlToRetry);
          }, 300);
        }
        return;
      }
      
      setHasError(true);
      setErrorMessage(errorMsg);
      setIsLoading(false);
      navigationInProgressRef.current = false;
    } else if (message.type === 'navigate_response') {
      console.log('[BrowserViewer] Navigation response:', { 
        success: message.success, 
        url: message.url,
        requestId: message.request_id,
        previousUrl: currentUrlRef.current
      });
      
      // Clear navigation timeout since we got a response
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
      
      // IMPORTANT: Clear navigation flag BEFORE updating URL to allow next navigation immediately
      navigationInProgressRef.current = false;
      
      if (message.success) {
        const newUrl = message.url || currentUrlRef.current;
        const previousUrl = currentUrlRef.current;
        setCurrentUrl(newUrl);
        currentUrlRef.current = newUrl; // Update ref with server's URL (may be normalized/redirected)
        setCurrentTitle(message.title || title);
        // Keep loading until first frame arrives
        // Clear any pending navigation since this one succeeded
        pendingNavigationRef.current = null;
        
        console.log('[BrowserViewer] ✅ Navigation succeeded, URL updated:', { 
          from: previousUrl, 
          to: newUrl,
          navigationInProgress: navigationInProgressRef.current
        });
        
        // Request frames after navigation - send multiple triggers to ensure frames start
        // Some stream servers need triggers to start sending frames after navigation
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          console.log('[BrowserViewer] Requesting frames after navigation');
          
          // Send multiple mouse move events to trigger frame capture
          // This ensures frames start even if the first trigger is missed
          const triggerFrame = () => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'mouse_move',
                x: Math.random() * 10 + 1, // Slight random movement
                y: Math.random() * 10 + 1,
                viewportWidth: 1280,
                viewportHeight: 720
              }));
            }
          };
          
          // Trigger immediately
          triggerFrame();
          
          // Trigger again after short delays to ensure frames start
          setTimeout(triggerFrame, 100);
          setTimeout(triggerFrame, 300);
          setTimeout(triggerFrame, 500);
        }
        
        // Set timeout to clear loading if no frames arrive within 10 seconds
        if (frameTimeoutRef.current) {
          clearTimeout(frameTimeoutRef.current);
        }
        frameTimeoutRef.current = setTimeout(() => {
          console.warn('[BrowserViewer] ⚠️ No frames received after navigation, clearing loading state');
          console.warn('[BrowserViewer] This may indicate a server-side issue - check Electron browser logs');
          setIsLoading(false);
          frameTimeoutRef.current = null;
          
          // Try one more frame request before giving up
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            console.log('[BrowserViewer] Sending final frame request before timeout');
            wsRef.current.send(JSON.stringify({
              type: 'mouse_move',
              x: 640,
              y: 360,
              viewportWidth: 1280,
              viewportHeight: 720
            }));
          }
        }, 10000); // 10 second timeout for frames
      } else {
        const errorMsg = message.error || 'Navigation failed';
        console.error('[BrowserViewer] Navigation failed:', errorMsg);
        
        // Handle "Execution context was destroyed" error gracefully
        if (errorMsg.includes('Execution context was destroyed') || 
            errorMsg.includes('navigation')) {
          console.warn('[BrowserViewer] Navigation context error (likely benign):', errorMsg);
          // Don't show error, just retry if there's a pending navigation
          if (pendingNavigationRef.current) {
            const urlToRetry = pendingNavigationRef.current;
            pendingNavigationRef.current = null;
            setTimeout(() => {
              navigateToUrl(urlToRetry);
            }, 300);
          }
          return;
        }
        
        setHasError(true);
        setErrorMessage(errorMsg);
        setIsLoading(false);
      }
    }
  }, [title, navigateToUrl]);

  // Handle frame data
  const handleFrame = useCallback((data: Blob | ArrayBuffer) => {
    if (!canvasRef.current) {
      console.warn('[BrowserViewer] Canvas ref not available');
      return;
    }

    // Clear frame timeout since we received a frame
    if (frameTimeoutRef.current) {
      clearTimeout(frameTimeoutRef.current);
      frameTimeoutRef.current = null;
    }
    
    lastFrameTimeRef.current = Date.now();
    console.log('[BrowserViewer] 🖼️ Processing frame data:', { 
      size: data instanceof Blob ? data.size : data.byteLength,
      type: data instanceof Blob ? 'Blob' : 'ArrayBuffer'
    });

    const blob = data instanceof Blob ? data : new Blob([data]);
    const url = URL.createObjectURL(blob);

    // Create new image for each frame to ensure updates
    const img = new Image();
    img.onload = () => {
      if (canvasRef.current && img.complete) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          // Set canvas size to match actual browser viewport (1920x1080)
          // This maintains the full resolution for scrolling
          canvasRef.current.width = img.width;
          canvasRef.current.height = img.height;

          // Draw image at full size
          ctx.drawImage(img, 0, 0);
          setIsLoading(false);
          console.log('[BrowserViewer] ✅ Frame rendered:', {
            width: img.width,
            height: img.height,
            canvasWidth: canvasRef.current.width,
            canvasHeight: canvasRef.current.height
          });
        }
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = (error) => {
      console.error('[BrowserViewer] ❌ Error loading frame image:', error);
      URL.revokeObjectURL(url);
      // Don't clear loading on image error - might be a bad frame, wait for next one
    };

    img.src = url;
  }, []);

  // Handle user interactions
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Focus canvas for keyboard input
    canvasRef.current.focus();

    const rect = canvasRef.current.getBoundingClientRect();
    const canvas = canvasRef.current;

    // Get click position relative to displayed canvas
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;

    // Scale coordinates from displayed size to actual canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = displayX * scaleX;
    const y = displayY * scaleY;

    // Send actual canvas dimensions (1920x1080) as viewport size
    const viewportWidth = canvas.width;
    const viewportHeight = canvas.height;

    console.log('[BrowserViewer] Click mapped:', {
      display: { x: displayX, y: displayY, width: rect.width, height: rect.height },
      actual: { x, y, width: viewportWidth, height: viewportHeight },
      scale: { x: scaleX, y: scaleY }
    });

    wsRef.current.send(JSON.stringify({
      type: 'mouse_click',
      x,
      y,
      viewportWidth,
      viewportHeight,
      button: e.button === 2 ? 'right' : 'left'
    }));
  }, []);

  // Use ref for native mouse move (throttled for performance)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let lastMoveTime = 0;
    const throttleDelay = 16; // ~60fps

    const handleMouseMove = (e: MouseEvent) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }

      const now = Date.now();
      if (now - lastMoveTime < throttleDelay) {
        return; // Throttle mouse moves
      }
      lastMoveTime = now;

      const rect = canvas.getBoundingClientRect();

      // Get mouse position relative to displayed canvas
      const displayX = e.clientX - rect.left;
      const displayY = e.clientY - rect.top;

      // Scale coordinates from displayed size to actual canvas resolution
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = displayX * scaleX;
      const y = displayY * scaleY;

      // Send actual canvas dimensions as viewport size
      const viewportWidth = canvas.width;
      const viewportHeight = canvas.height;

      wsRef.current.send(JSON.stringify({
        type: 'mouse_move',
        x,
        y,
        viewportWidth,
        viewportHeight
      }));
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isConnected]);

  // Use ref for native wheel event (non-passive)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      
      wsRef.current.send(JSON.stringify({
        type: 'scroll',
        deltaX: e.deltaX,
        deltaY: e.deltaY
      }));
    };

    // Add native event listener with { passive: false } to allow preventDefault
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [isConnected]);

  // Handle keyboard input with native event listener (non-passive)
  useEffect(() => {
    const container = canvasRef.current?.parentElement;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }

      // Don't intercept if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Don't intercept browser shortcuts (Cmd/Ctrl + key combinations)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      // Determine if we should handle this key
      let shouldHandle = false;
      let keyText = '';

      // Send special keys
      if (['Enter', 'Backspace', 'Delete', 'Tab', 'Escape'].includes(e.key)) {
        shouldHandle = true;
        keyText = e.key === 'Enter' ? '\n' : e.key === 'Tab' ? '\t' : e.key === 'Backspace' ? '\b' : e.key === 'Delete' ? '\x7f' : e.key;
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        // Handle arrow keys
        shouldHandle = true;
        keyText = e.key;
      } else if (e.key.length === 1) {
        // Send regular characters (only if no modifiers)
        shouldHandle = true;
        keyText = e.key;
      }

      // Only prevent default and send if we're actually handling the key
      if (shouldHandle) {
        e.preventDefault();
        e.stopPropagation();
        wsRef.current.send(JSON.stringify({
          type: 'keyboard_type',
          text: keyText
        }));
      }
    };

    container.addEventListener('keydown', handleKeyDown, true); // Use capture phase

    return () => {
      container.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isConnected]);

  const handleRefresh = useCallback(() => {
    if (currentUrl) {
      navigateToUrl(currentUrl);
    }
  }, [currentUrl, navigateToUrl]);

  const handleGoBack = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const requestId = `back_${Date.now()}`;
    wsRef.current.send(JSON.stringify({
      type: 'go_back',
      request_id: requestId
    }));
  }, []);

  const handleGoForward = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const requestId = `forward_${Date.now()}`;
    wsRef.current.send(JSON.stringify({
      type: 'go_forward',
      request_id: requestId
    }));
  }, []);

  // Connect when URL changes
  useEffect(() => {
    if (prevUrlRef.current !== url) {
      console.log('[BrowserViewer] 📄 Opening web page:', { url, title, previousUrl: prevUrlRef.current });
      prevUrlRef.current = url;
      setCurrentUrl(url);
      setCurrentTitle(title); // Update title immediately
      currentUrlRef.current = url; // Update ref
      setIsLoading(true);
      setHasError(false);

      // Clear the canvas to remove old page content
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          console.log('[BrowserViewer] Cleared canvas for tab switch');
        }
      }

      // Clear navigation state when URL changes (important for tab switching)
      navigationInProgressRef.current = false;
      pendingNavigationRef.current = null;

      // Clear any pending navigation timeouts
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }

      // Clear frame timeout
      if (frameTimeoutRef.current) {
        clearTimeout(frameTimeoutRef.current);
        frameTimeoutRef.current = null;
      }

      // Clear frame buffer
      frameBufferRef.current = null;

      // Connect if not already connected
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        // Store URL to navigate to after connection
        pendingNavigationRef.current = url;
        connect();
      } else {
        // Already connected, navigate immediately
        // Force navigation even if one appears to be in progress (URL prop change takes precedence)
        console.log('[BrowserViewer] URL prop changed, forcing navigation:', url);
        pendingNavigationRef.current = null;

        // If navigation is in progress, cancel it first
        if (navigationInProgressRef.current) {
          console.log('[BrowserViewer] Cancelling in-progress navigation for URL prop change');
          if (navigationTimeoutRef.current) {
            clearTimeout(navigationTimeoutRef.current);
            navigationTimeoutRef.current = null;
          }
          navigationInProgressRef.current = false;
        }

        navigateToUrl(url);
      }
    }
  }, [url, title, connect, navigateToUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      if (frameTimeoutRef.current) {
        clearTimeout(frameTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border">
        <button
          onClick={handleGoBack}
          className="p-1.5 hover:bg-accent rounded-md transition-colors disabled:opacity-50"
          title="Go back"
          disabled={!isConnected}
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={handleGoForward}
          className="p-1.5 hover:bg-accent rounded-md transition-colors disabled:opacity-50"
          title="Go forward"
          disabled={!isConnected}
        >
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={handleRefresh}
          className="p-1.5 hover:bg-accent rounded-md transition-colors disabled:opacity-50"
          title="Refresh"
          disabled={!isConnected}
        >
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1 px-3 py-1.5 bg-background rounded-md text-sm text-muted-foreground truncate border border-border/50">
          {currentUrl}
        </div>
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 hover:bg-accent rounded-md transition-colors"
          title="Open in new tab"
        >
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </a>
      </div>

      {/* Loading indicator */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <p className="text-sm text-muted-foreground">
              {isConnected ? `Loading ${currentTitle || currentUrl}...` : 'Connecting to browser...'}
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="flex-1 flex items-center justify-center bg-background p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-yellow-500/10 rounded-full">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Browser Error</h3>
              <p className="text-sm text-muted-foreground">
                {errorMessage || 'Failed to load page. Make sure the Electron browser is running.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={connect}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Connection
              </button>
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md transition-colors text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Browser canvas */}
      {!hasError && (
        <div
          className="flex-1 relative overflow-auto bg-gray-900"
          tabIndex={0}
          style={{ outline: 'none' }}
        >
          <canvas
            ref={canvasRef}
            className="cursor-pointer"
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              imageRendering: 'auto',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              outline: 'none'
            }}
            tabIndex={0}
            onClick={handleCanvasClick}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Send right-click to browser
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                const canvas = canvasRef.current;

                // Get click position relative to displayed canvas
                const displayX = e.clientX - rect.left;
                const displayY = e.clientY - rect.top;

                // Scale coordinates from displayed size to actual canvas resolution
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                const x = displayX * scaleX;
                const y = displayY * scaleY;

                wsRef.current.send(JSON.stringify({
                  type: 'mouse_click',
                  x,
                  y,
                  viewportWidth: canvas.width,
                  viewportHeight: canvas.height,
                  button: 'right'
                }));
              }
            }}
          />
        </div>
      )}
    </div>
  );
}


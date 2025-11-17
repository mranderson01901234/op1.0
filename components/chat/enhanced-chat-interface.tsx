"use client";

/**
 * ⚠️ CRITICAL: Scroll Positioning Logic
 * 
 * This component implements complex scroll positioning logic to prevent visual flashing and jumping.
 * 
 * BEFORE MAKING ANY CHANGES TO SCROLL POSITIONING:
 * 1. Read SCROLL_POSITIONING_LOGIC.md in the project root
 * 2. Understand the difference between short chats (≤50% viewport) and long chats (>50% viewport)
 * 3. Test all scenarios: short/long responses in short/long chats
 * 
 * Key sections marked with ⚠️ CRITICAL comments:
 * - User message positioning (useLayoutEffect ~line 209)
 * - Short response detection (useEffect ~line 300)
 * - Response completion positioning (useLayoutEffect ~line 479)
 * - Response rendering (div ~line 933)
 * - Ref resets (handleSendMessage ~line 687)
 * 
 * DO NOT refactor these sections without understanding the full flow.
 */

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { flushSync } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Copy, Check, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { ChatInput } from "./chat-input";
import { MessageRenderer } from "./message-renderer";
import { WelcomeScreen } from "./welcome-screen";
import { ProcessingIndicator } from "../ui/processing-indicator";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { saveConversation, getConversations, getConversation } from "@/lib/storage";
import { generateConversationTitle } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Message, Conversation } from "@/lib/types";
import { useEditor } from "@/contexts/editor-context";
import SearchResponse from "./SearchResponse";
import type { BraveSearchResult } from "@/lib/search/braveSearch";
import { throttle } from "@/lib/utils/throttle";

export function EnhancedChatInterface() {
  // Access editor context
  const { openFiles, activeFile, activeTab, openUrl } = useEditor();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string>("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [retryingMessageIndex, setRetryingMessageIndex] = useState<number | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [spacerHeight, setSpacerHeight] = useState(0);
  const [positioningMessageId, setPositioningMessageId] = useState<string | null>(null); // Track message being positioned
  const [positioningResponseId, setPositioningResponseId] = useState<string | null>(null); // Track response being positioned after completion
  const [currentToolCall, setCurrentToolCall] = useState<{ tool: string; params: any } | null>(null); // Track active tool execution
  const [currentSearchResults, setCurrentSearchResults] = useState<BraveSearchResult[]>([]); // Track search results for current response
  const [highlightedCitation, setHighlightedCitation] = useState<number | null>(null); // Track highlighted citation

  // Get current user ID from Clerk (will be null if not signed in or Clerk not configured)
  const { user } = useUser();
  const userId = user?.id || null;

  // Use a ref to store search results to avoid closure issues in the stream handler
  const searchResultsRef = useRef<BraveSearchResult[]>([]);

  const messagesRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const lastUserMessageId = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);
  const scrollAnimationFrameRef = useRef<number | null>(null);
  const lastScrollCheckRef = useRef<number>(0);
  const scrollThrottleMs = 50; // Only check/scroll every 50ms during streaming
  const isShortChatRef = useRef<boolean>(false); // Track if current chat is short
  const lastScrollHeightRef = useRef<number>(0); // Track last scroll height to avoid unnecessary scrolls
  const processingIndicatorRef = useRef<HTMLDivElement>(null); // Ref for processing indicator to measure height
  const positionLockedRef = useRef<boolean>(false); // Track if we've locked position to prevent flash
  const positionedMessageIdsRef = useRef<Set<string>>(new Set()); // Track which messages have been positioned
  const shortResponseDetectedRef = useRef<boolean>(false); // Track if we've detected response will be short
  const responseLengthCheckCountRef = useRef<number>(0); // Track how many times we've checked response length
  const streamingStartTimeRef = useRef<number>(0); // Track when streaming started

  // Helper function to format tool call messages in natural language
  // Memoized to avoid recreating on every render
  const formatToolCallMessage = useCallback((tool: string, params: any): string => {
    const toolMessages: Record<string, (params: any) => string> = {
      read_file: (p) => `Reading file: ${p.path}`,
      write_file: (p) => `Writing to file: ${p.path}`,
      list_directory: (p) => `Listing directory: ${p.path}`,
      execute_command: (p) => `Executing command: ${p.command}`,
      get_system_info: () => `Getting system information`,
      get_system_health: () => `Checking system health`,
      get_cpu_usage: () => `Analyzing CPU usage`,
      get_memory_usage: () => `Checking memory usage`,
      get_disk_space: (p) => p.path ? `Checking disk space for ${p.path}` : `Checking disk space`,
      get_network_info: () => `Gathering network information`,
      get_process_list: (p) => p.filter ? `Listing processes matching "${p.filter}"` : `Listing running processes`,
      search_files: (p) => `Searching for files matching "${p.pattern}" in ${p.path}`,
      search_content: (p) => `Searching for "${p.query}" in ${p.path}`,
      get_current_directory: () => `Getting current directory`,
      git_status: (p) => `Checking git status in ${p.path}`,
      git_diff: (p) => `Getting git diff from ${p.path}`,
      run_npm_command: (p) => `Running npm ${p.command}`,
      install_package: (p) => `Installing ${p.package_name}`,
      create_directory: (p) => `Creating directory: ${p.path}`,
      delete_file: (p) => `Deleting file: ${p.path}`,
      delete_directory: (p) => `Deleting directory: ${p.path}`,
      move_file: (p) => `Moving ${p.source} to ${p.destination}`,
      copy_file: (p) => `Copying ${p.source} to ${p.destination}`,
      get_file_info: (p) => `Getting info for: ${p.path}`,
      get_directory_size: (p) => `Calculating size of ${p.path}`,
      get_environment_variables: (p) => p.names ? `Getting environment variables: ${p.names}` : `Getting environment variables`,
    };

    const formatter = toolMessages[tool];
    return formatter ? formatter(params || {}) : `Using tool: ${tool}`;
  }, []);

  // Scroll to bottom - shows latest messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Stable scroll to bottom for short chats - only scrolls if already near bottom
  const scrollToBottomIfNear = useCallback(() => {
    const container = messagesRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // Only scroll if already near bottom (within 200px) to avoid jumping if user scrolled up
    if (distanceFromBottom < 200) {
      // Use scrollIntoView with instant behavior for stability
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }
  }, []);

  // Calculate if we need to adjust scroll position for new user message
  const calculateScrollForNewMessage = useCallback(() => {
    const container = messagesRef.current;
    if (!container) return null;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const viewportUsage = scrollHeight / clientHeight;
    
    // If chat uses more than 50% of viewport, we need to adjust placement
    if (viewportUsage > 0.5) {
      // Calculate desired position: leave space at top and ensure room for response
      const offsetFromTop = 120; // Space from top for user message
      const spaceForResponse = Math.min(clientHeight * 0.6, 600); // 60% of viewport or max 600px
      const desiredScrollTop = scrollHeight - clientHeight + spaceForResponse - offsetFromTop;
      
      return Math.max(0, desiredScrollTop);
    }
    
    // For short chats, just scroll to bottom
    return null;
  }, []);

  // Scroll user message to appropriate position
  const scrollToUserMessage = useCallback(() => {
    if (!messagesRef.current || !lastUserMessageId.current) return;

    const container = messagesRef.current;
    const targetScroll = calculateScrollForNewMessage();
    
    if (targetScroll !== null) {
      // Scroll to calculated position immediately (no smooth scroll to prevent jumping)
      container.scrollTop = targetScroll;
    } else {
      // For short chats, scroll to bottom
      scrollToBottom();
    }
  }, [calculateScrollForNewMessage, scrollToBottom]);

  // Check if user is near bottom of scroll
  const isNearBottom = useCallback(() => {
    const container = messagesRef.current;
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom < 150;
  }, []);

  // Check if user message is about to scroll out of view
  const isUserMessageAtTop = useCallback(() => {
    const container = messagesRef.current;
    if (!container || !lastUserMessageId.current) return false;

    const messageElement = container.querySelector(`[data-message-id="${lastUserMessageId.current}"]`) as HTMLElement;
    if (!messageElement) {
      // If element not found, don't stop scrolling (might be still rendering)
      return false;
    }

    const containerRect = container.getBoundingClientRect();
    const messageRect = messageElement.getBoundingClientRect();
    
    // Calculate message position relative to viewport
    const messageTopRelativeToViewport = messageRect.top - containerRect.top;
    
    // Stop scrolling if the top of the user message is about to scroll out of view
    // Use a threshold to stop before it actually goes out of view
    // This ensures the entire message stays visible
    const threshold = 100; // Stop scrolling when message top is within 100px of viewport top
    
    // Only return true if message is actually visible and approaching the top
    // If message is above viewport (negative), it's already out of view, so stop
    // If message is within threshold, stop scrolling
    return messageTopRelativeToViewport <= threshold;
  }, []);

  // Smooth incremental scroll function
  const smoothScrollToBottom = useCallback(() => {
    const container = messagesRef.current;
    if (!container || !shouldAutoScrollRef.current) return;

    // Check if user message is about to scroll out of view - if so, stop scrolling
    if (isUserMessageAtTop()) {
      shouldAutoScrollRef.current = false;
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const maxScroll = scrollHeight - clientHeight;
    const distanceToBottom = maxScroll - scrollTop;

    // If already at bottom (within 5px), stop
    if (distanceToBottom <= 5) {
      return;
    }

    // Smooth incremental scroll - scroll a portion of remaining distance
    const scrollStep = Math.max(10, distanceToBottom * 0.15); // Scroll 15% of remaining distance or at least 10px
    const newScrollTop = Math.min(scrollTop + scrollStep, maxScroll);
    
    container.scrollTop = newScrollTop;

    // Continue scrolling if not at bottom yet AND user message hasn't reached threshold
    // Check again after scrolling to ensure we stop immediately when threshold is reached
    if (newScrollTop < maxScroll && !isUserMessageAtTop()) {
      scrollAnimationFrameRef.current = requestAnimationFrame(smoothScrollToBottom);
    } else if (isUserMessageAtTop()) {
      // Stop scrolling if user message is about to go out of view
      shouldAutoScrollRef.current = false;
    }
  }, [isUserMessageAtTop]);

  // Check if should show scroll to bottom button
  const checkScrollPosition = useCallback(() => {
    const container = messagesRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollButton(distanceFromBottom > 200);
  }, []);

  // Throttled scroll handler to improve performance
  const throttledCheckScrollPosition = useMemo(
    () => throttle(checkScrollPosition, 100),
    [checkScrollPosition]
  );

  // Monitor scroll position with throttling
  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;

    container.addEventListener("scroll", throttledCheckScrollPosition, { passive: true });
    return () => container.removeEventListener("scroll", throttledCheckScrollPosition);
  }, [throttledCheckScrollPosition]);

  // ⚠️ SIMPLIFIED: Always scroll to bottom - no complex positioning
  // This eliminates all visual jumping by keeping chat at bottom
  // EXCEPT for search queries - disable auto-scroll for web search
  useLayoutEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user" && lastMessage.id === lastUserMessageId.current) {
        // Skip if already positioned this message
        if (positionedMessageIdsRef.current.has(lastMessage.id)) {
          return;
        }

        // Disable auto-scroll for search queries
        if (lastMessage.isSearchQuery) {
          shouldAutoScrollRef.current = false;
          positionedMessageIdsRef.current.add(lastMessage.id);
          isShortChatRef.current = true;
          return;
        }

        const container = messagesRef.current;
        if (!container) {
          return;
        }

        // SIMPLIFIED: Always scroll to bottom immediately - no spacer, no complex logic
        const { scrollHeight, clientHeight } = container;
        const maxScroll = scrollHeight - clientHeight;

        // Disable smooth scrolling for instant positioning
        const originalScrollBehavior = container.style.scrollBehavior;
        container.style.scrollBehavior = 'auto';

        // No spacer - just scroll to bottom
        flushSync(() => {
          setSpacerHeight(0);
        });

        container.scrollTop = maxScroll;
        container.style.scrollBehavior = originalScrollBehavior;

        // Mark as positioned
        positionedMessageIdsRef.current.add(lastMessage.id);
        isShortChatRef.current = true; // Always treat as short chat
      }
    }
  }, [messages.length]);

  // ⚠️ SIMPLIFIED: Streaming scroll - always scroll to bottom
  // EXCEPT for search queries - disable auto-scroll for web search
  useEffect(() => {
    if (isStreaming && streamingContent) {
      // Check if current streaming is for a search query
      const lastUserMessage = messages.find(m => m.id === lastUserMessageId.current);
      const isSearchQuery = lastUserMessage?.isSearchQuery || currentSearchResults.length > 0;
      
      // Disable auto-scroll for search queries
      if (isSearchQuery) {
        shouldAutoScrollRef.current = false;
        return;
      }

      const container = messagesRef.current;
      if (!container || !shouldAutoScrollRef.current) return;

      const { scrollHeight } = container;
      const now = Date.now();
      const timeSinceLastCheck = now - lastScrollCheckRef.current;

      // Throttle scrolling to every 100ms
      if (timeSinceLastCheck >= 100 && scrollHeight > lastScrollHeightRef.current) {
        lastScrollCheckRef.current = now;
        lastScrollHeightRef.current = scrollHeight;

        // Simply scroll to bottom
        requestAnimationFrame(() => {
          if (container && shouldAutoScrollRef.current) {
            const { scrollHeight, clientHeight } = container;
            const maxScroll = scrollHeight - clientHeight;
            container.scrollTop = maxScroll;
          }
        });
      }
    }
  }, [streamingContent, isStreaming, messages, currentSearchResults]);

  // Initial load - start at bottom
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [currentConversationId]);

  // ⚠️ SIMPLIFIED: Response completion - no positioning logic needed
  // Since we always stay at bottom, no adjustment needed when response completes
  // EXCEPT for search queries - disable auto-scroll for web search
  useLayoutEffect(() => {
    if (messages.length >= 2) {
      const lastMessage = messages[messages.length - 1];
      // Just ensure spacer is 0 when response completes
      if (lastMessage.role === "assistant") {
        setSpacerHeight(0);
        
        // Disable auto-scroll if this is a search response
        if (lastMessage.searchResults && lastMessage.searchResults.length > 0) {
          shouldAutoScrollRef.current = false;
        }
      }
    }
  }, [messages.length]);

  // Load last conversation on mount or when user changes
  useEffect(() => {
    const conversations = getConversations(userId);
    if (conversations.length > 0) {
      const lastConversation = conversations[0];
      setCurrentConversationId(lastConversation.id);
      setMessages(lastConversation.messages);
      positionedMessageIdsRef.current.clear(); // Reset for loaded conversation
      // Dispatch event to notify sidebar of current conversation
      window.dispatchEvent(new CustomEvent('conversation-changed', { detail: lastConversation.id }));
    } else {
      // Create new conversation
      setCurrentConversationId(`conv_${Date.now()}`);
      positionedMessageIdsRef.current.clear(); // Reset for new conversation
    }
  }, [userId]);

  // Listen for load-conversation events from sidebar
  useEffect(() => {
    const handleLoadConversation = (event: CustomEvent<string>) => {
      const conversationId = event.detail;
      const conversation = getConversation(conversationId, userId);
      
      if (conversation) {
        setCurrentConversationId(conversation.id);
        setMessages(conversation.messages);
        positionedMessageIdsRef.current.clear();
        // Dispatch event to notify sidebar of current conversation
        window.dispatchEvent(new CustomEvent('conversation-changed', { detail: conversation.id }));
      }
    };

    window.addEventListener('load-conversation', handleLoadConversation as EventListener);
    return () => {
      window.removeEventListener('load-conversation', handleLoadConversation as EventListener);
    };
  }, [userId]);

  // Save conversation to localStorage
  const saveCurrentConversation = useCallback((msgs: Message[]) => {
    if (msgs.length === 0) return;

    const conversation: Conversation = {
      id: currentConversationId,
      title: generateConversationTitle(msgs[0].content),
      messages: msgs,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    saveConversation(conversation, userId);
    // Dispatch event to notify sidebar of conversation save
    window.dispatchEvent(new CustomEvent('conversation-saved'));
  }, [currentConversationId, userId]);

  const handleNewChat = useCallback(() => {
    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Save current conversation before starting a new one
    if (messages.length > 0 && currentConversationId) {
      saveCurrentConversation(messages);
    }
    
    // Clear current state and start fresh
    setMessages([]);
    setStreamingContent("");
    setIsLoading(false);
    setIsStreaming(false);
    setSpacerHeight(0);
    setPositioningMessageId(null); // Clear positioning state
    setPositioningResponseId(null); // Clear response positioning state
    positionedMessageIdsRef.current.clear(); // Reset positioned messages for new chat
    const newConversationId = `conv_${Date.now()}`;
    setCurrentConversationId(newConversationId);
    // Dispatch event to notify sidebar of new conversation
    window.dispatchEvent(new CustomEvent('conversation-changed', { detail: newConversationId }));
    toast.success("Started new conversation");
  }, [messages, currentConversationId, saveCurrentConversation]);

  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleCitationClick = useCallback((citationIndex: number) => {
    // Highlight the citation
    setHighlightedCitation(citationIndex);

    // Scroll to the source card
    const sourceElement = document.getElementById(`source-${citationIndex}`);
    if (sourceElement) {
      sourceElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Clear highlight after 2 seconds
    setTimeout(() => {
      setHighlightedCitation(null);
    }, 2000);
  }, []);

  const handleSourceClick = useCallback((url: string, index: number) => {
    // Get the source title from search results
    const searchResults = currentSearchResults.length > 0 ? currentSearchResults : [];
    const source = searchResults[index];
    const title = source?.title || new URL(url).hostname;

    // Open in right pane web viewer
    openUrl(url, title);
  }, [currentSearchResults, openUrl]);

  const handleRelatedQuestionClick = useCallback((question: string) => {
    // Send the related question as a new message
    handleSendMessage(question, true); // Pass true to force search mode
  }, []);

  const handleRetry = async (messageIndex: number) => {
    if (messageIndex < 0 || messageIndex >= messages.length) return;

    const userMessage = messages[messageIndex];
    if (userMessage.role !== "user") return;

    // Remove messages from this point forward
    const messagesToKeep = messages.slice(0, messageIndex);
    setMessages(messagesToKeep);
    setRetryingMessageIndex(messageIndex);

    // Retry with the user's message, preserving original search mode
    await handleSendMessage(userMessage.content, userMessage.isSearchQuery || false, messagesToKeep);
    setRetryingMessageIndex(null);
  };

  const handleSendMessage = async (content: string, searchMode: boolean = false, previousMessages: Message[] = messages) => {
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
      isSearchQuery: searchMode, // Track if this is a search query
    };

    // Store the ID so we can identify it after render
    lastUserMessageId.current = userMessage.id;

    // Cancel any existing scroll animations
    if (scrollAnimationFrameRef.current !== null) {
      cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = null;
    }

    // ⚠️ CRITICAL: Reset refs for new message
    // These refs MUST be reset when starting a new message to ensure correct positioning behavior.
    // DO NOT remove any of these resets without understanding their purpose.
    // See SCROLL_POSITIONING_LOGIC.md for details.
    // For search queries, disable auto-scroll; otherwise enable it
    shouldAutoScrollRef.current = !searchMode;
    lastScrollHeightRef.current = 0;
    positionLockedRef.current = false;
    shortResponseDetectedRef.current = false;
    responseLengthCheckCountRef.current = 0;
    streamingStartTimeRef.current = 0;
    // Note: Don't clear positionedMessageIdsRef here - we want to track positioned messages across the conversation

    const updatedMessages = [...previousMessages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setStreamingContent("");
    setIsStreaming(false);
    setCurrentToolCall(null); // Clear any previous tool call state
    setCurrentSearchResults([]); // Clear previous search results
    searchResultsRef.current = []; // Clear ref too
    setHighlightedCitation(null); // Clear citation highlight

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Build editor context for the LLM (include both files and URLs)
      // Only include file content if it's small to reduce payload size
      const editorContext = (openFiles.length > 0 || activeTab) ? {
        openFiles: openFiles.map(f => ({ path: f.path, isDirty: f.isDirty })),
        activeFile: activeFile ? {
          path: activeFile.path,
          // Only send content if file is small (< 50KB) to reduce payload
          content: activeFile.content.length < 50000 ? activeFile.content : undefined,
          isDirty: activeFile.isDirty,
        } : null,
        activeTab: activeTab ? {
          type: activeTab.type,
          title: activeTab.title,
          url: activeTab.url,
          path: activeTab.path,
        } : null,
      } : null;

      console.log('[SEARCH-REQUEST] Sending request with:', {
        searchMode,
        lastMessage: content,
        messageCount: updatedMessages.length
      });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          editorContext,
          searchMode,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (response.status === 429) {
        toast.error("Rate limit exceeded. Please wait a minute.");
        setMessages(previousMessages); // Revert
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                // Use the ref value to avoid closure issues
                const finalSearchResults = searchResultsRef.current;

                console.log('[SEARCH-FINAL] Creating message with results:', {
                  hasResults: finalSearchResults.length > 0,
                  resultCount: finalSearchResults.length,
                  results: finalSearchResults
                });

                const assistantMessage: Message = {
                  id: `msg_${Date.now()}`,
                  role: "assistant",
                  content: accumulatedContent,
                  timestamp: new Date(),
                  searchResults: finalSearchResults.length > 0 ? finalSearchResults : undefined,
                };

                console.log('[SEARCH-COMPLETE] Assistant message created:', {
                  hasSearchResults: !!assistantMessage.searchResults,
                  resultCount: assistantMessage.searchResults?.length || 0,
                  messageId: assistantMessage.id
                });
                // ⚠️ CRITICAL: Response completion positioning state
                // Only set positioningResponseId for long chats - short chats skip positioning to prevent flashing.
                // For short chats, scroll to bottom before adding message to prevent jump.
                // DO NOT set positioningResponseId for short chats - this causes flashing.
                // Search results now use the same positioning logic as regular responses
                if (!isShortChatRef.current) {
                  setPositioningResponseId(assistantMessage.id);
                } else {
                  // For short chats, ensure we're at bottom before adding message to prevent jump
                  const container = messagesRef.current;
                  if (container) {
                    const { scrollHeight, clientHeight } = container;
                    const maxScroll = scrollHeight - clientHeight;
                    const originalScrollBehavior = container.style.scrollBehavior;
                    container.style.scrollBehavior = 'auto';
                    container.scrollTop = maxScroll;
                    container.style.scrollBehavior = originalScrollBehavior;
                  }
                }
                const finalMessages = [...updatedMessages, assistantMessage];
                setMessages(finalMessages);
                saveCurrentConversation(finalMessages);
                setStreamingContent("");
                setIsLoading(false);
                
                // Auto-open top search results in split view (similar to how files are opened)
                if (finalSearchResults.length > 0) {
                  // Open the top result automatically (non-video results preferred)
                  const topResult = finalSearchResults.find(r => r.type !== 'video') || finalSearchResults[0];
                  if (topResult) {
                    const title = topResult.title || new URL(topResult.url).hostname;
                    // Small delay to ensure UI is ready
                    setTimeout(() => {
                      openUrl(topResult.url, title);
                    }, 100);
                  }
                }
                
                setCurrentSearchResults([]); // Clear search results after message is finalized
                searchResultsRef.current = []; // Clear ref too
                return;
              }

              try {
                const parsed = JSON.parse(data);

                // Handle search results
                if (parsed.type === 'search_results') {
                  console.log('[SEARCH] Received search results:', parsed.results);
                  console.log('[SEARCH] Result count:', parsed.results?.length || 0);
                  const results = parsed.results || [];
                  searchResultsRef.current = results; // Store in ref to avoid closure issues
                  setCurrentSearchResults(results); // Also update state for re-renders
                  // Don't show these in streaming content
                  continue;
                }

                // Handle tool execution messages
                if (parsed.type === 'tool_call') {
                  setCurrentToolCall({ tool: parsed.tool, params: parsed.params });
                  // Add typewriter-style message to streaming content with separator
                  const toolMessage = `\n\n🔧 *${formatToolCallMessage(parsed.tool, parsed.params)}*\n\n---\n\n`;
                  accumulatedContent += toolMessage;
                  setStreamingContent(accumulatedContent);
                  // Keep isStreaming true during tool execution
                  setIsStreaming(true);
                } else if (parsed.type === 'tool_result') {
                  // Tool completed successfully, clear the indicator
                  setCurrentToolCall(null);

                  // Sync editor if write_file was executed
                  if (parsed.tool === 'write_file' && parsed.params) {
                    const { path, content } = parsed.params;
                    if (typeof window !== 'undefined' && (window as any).__operaStudioUpdateFileContent) {
                      (window as any).__operaStudioUpdateFileContent(path, content);
                    }
                  }

                  // Keep isStreaming true - content may follow
                  setIsStreaming(true);
                } else if (parsed.type === 'tool_error') {
                  // Tool failed, clear the indicator and show error in content
                  setCurrentToolCall(null);
                  const errorMessage = `\n⚠️ Tool execution error (${parsed.tool}): ${parsed.error}\n\n---\n\n`;
                  accumulatedContent += errorMessage;
                  setStreamingContent(accumulatedContent);
                  setIsStreaming(true);
                }

                // Handle regular content
                if (parsed.content) {
                  accumulatedContent += parsed.content;
                  setStreamingContent(accumulatedContent);
                  setIsStreaming(true);
                  // Reset scroll height tracking when streaming starts
                  if (lastScrollHeightRef.current === 0) {
                    const container = messagesRef.current;
                    if (container) {
                      lastScrollHeightRef.current = container.scrollHeight;
                    }
                  }
                }
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.info("Request cancelled");
      } else {
        console.error("Error sending message:", error);
        toast.error("Failed to send message. Please try again.");

        // Add user message and error response
        const assistantMessage: Message = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: "I apologize, but I encountered an error. Please try again.",
          timestamp: new Date(),
        };
        // Only set positioning state for long chats that need positioning
        // For short chats, don't set it to avoid flashing
        if (!isShortChatRef.current) {
          setPositioningResponseId(assistantMessage.id);
        } else {
          // For short chats, ensure we're at bottom before adding message to prevent jump
          const container = messagesRef.current;
          if (container) {
            const { scrollHeight, clientHeight } = container;
            const maxScroll = scrollHeight - clientHeight;
            const originalScrollBehavior = container.style.scrollBehavior;
            container.style.scrollBehavior = 'auto';
            container.scrollTop = maxScroll;
            container.style.scrollBehavior = originalScrollBehavior;
          }
        }
        setMessages([...updatedMessages, assistantMessage]);
      }
      setIsLoading(false);
      setStreamingContent("");
      setCurrentSearchResults([]); // Clear search results on error
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewChat: handleNewChat,
  });

  // Listen for new chat event from sidebar
  useEffect(() => {
    const handleNewChatEvent = () => {
      handleNewChat();
    };
    
    window.addEventListener('new-chat', handleNewChatEvent);
    return () => {
      window.removeEventListener('new-chat', handleNewChatEvent);
    };
  }, [handleNewChat]);

  const hasMessages = messages.length > 0 || streamingContent;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Messages Area - grows to fill space */}
      <div
        ref={messagesRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-8 py-6"
      >
        <div className="mx-auto w-full max-w-[900px] overflow-hidden">
          {!hasMessages ? (
            <WelcomeScreen onPromptSelect={handleSendMessage} />
          ) : (
            <motion.div 
              className="flex flex-col space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ 
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1]
              }}
            >
              <AnimatePresence mode="popLayout">
                {messages.map((message, index) => {
                  const isLastUserMessage = message.id === lastUserMessageId.current;

                  // Check if next message is assistant response to this user message
                  const nextMessage = messages[index + 1];
                  const hasAssistantReply = message.role === "user" && nextMessage?.role === "assistant";

                  // Skip rendering assistant messages that are replies (they'll be shown inside user message)
                  if (message.role === "assistant" && index > 0 && messages[index - 1].role === "user") {
                    return null;
                  }

                  // Check if we need spacer for this message
                  const needsSpacer = isLastUserMessage && !hasAssistantReply && spacerHeight > 0;
                  const isPositioning = positioningMessageId === message.id;

                  return (
                    <>
                    <motion.div
                      key={message.id}
                      data-message-id={message.id}
                      ref={isLastUserMessage ? lastUserMessageRef : null}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: isPositioning ? 0 : 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ 
                        duration: 0.4,
                        ease: [0.16, 1, 0.3, 1] // Smooth ease-out curve
                      }}
                      className={cn(
                        "group relative mb-6 px-6",
                        message.role === "user" ? "flex justify-end" : "flex justify-start"
                      )}
                    >
                    <div className="relative w-full max-w-full">
                      {/* Show processing indicator while positioning */}
                      {isPositioning && (
                        <div className={cn(
                          "mb-4",
                          message.role === "user" ? "flex justify-end" : "flex justify-start"
                        )}>
                          <ProcessingIndicator />
                        </div>
                      )}
                      <MessageRenderer
                        content={message.content}
                        isUser={message.role === "user"}
                      />

                      {/* ⚠️ CRITICAL: Completed assistant response rendering
                          Uses regular div (not motion.div) to avoid animation overhead that causes flashing.
                          Opacity controlled via style prop based on positioningResponseId.
                          For short chats: positioningResponseId is never set, so response appears immediately.
                          DO NOT change to motion.div or remove opacity control without reading SCROLL_POSITIONING_LOGIC.md */}
                      {/* Completed OR streaming assistant response attached to user message */}
                      {message.role === "user" && (hasAssistantReply || (isLastUserMessage && streamingContent)) && (
                        <div
                          className="mt-6 group"
                          style={{
                            opacity: positioningResponseId === nextMessage?.id ? 0 : 1,
                            pointerEvents: positioningResponseId === nextMessage?.id ? 'none' : undefined
                          }}
                        >
                          {/* Use SearchResponse for search results, regular MessageRenderer otherwise */}
                          {(() => {
                            // Check for search results in either completed message or current streaming state
                            const isStreaming = Boolean(isLastUserMessage && streamingContent);
                            const searchResults = isStreaming ? currentSearchResults : (nextMessage?.searchResults || []);
                            const content = isStreaming ? streamingContent : (nextMessage?.content || '');
                            // Fix: Always render SearchResponse for search queries
                            // Check both: user message was a search query OR assistant message has search results
                            const isSearchQuery = message.isSearchQuery || false;
                            const assistantHasSearchResults = (nextMessage?.searchResults?.length || 0) > 0;
                            const hasSearchResults = searchResults.length > 0 || isSearchQuery || assistantHasSearchResults;

                            console.log('[SEARCH-UI] Unified render:', {
                              hasSearchResults,
                              isSearchQuery,
                              assistantHasSearchResults,
                              resultCount: searchResults.length,
                              isStreaming,
                              messageId: nextMessage?.id,
                              userMessageIsSearch: message.isSearchQuery,
                              assistantResultsCount: nextMessage?.searchResults?.length,
                              willRenderSearchResponse: hasSearchResults
                            });

                            return hasSearchResults ? (
                              <SearchResponse
                                query={message.content}
                                searchResults={searchResults}
                                aiResponse={content}
                                isStreaming={isStreaming}
                                onCitationClick={handleCitationClick}
                                onSourceClick={handleSourceClick}
                                onRelatedQuestionClick={handleRelatedQuestionClick}
                                highlightedCitation={highlightedCitation}
                                thinkingStage={isStreaming ? 'analyzing' : 'done'}
                              />
                            ) : (
                              <MessageRenderer
                                content={content}
                                isUser={false}
                                onCitationClick={handleCitationClick}
                                onSourceClick={handleSourceClick}
                              />
                            );
                          })()}

                          {/* Action buttons for completed assistant response - only show when not streaming */}
                          {nextMessage && !streamingContent && (
                            <>
                              <button
                                onClick={() => handleCopyMessage(nextMessage.content, nextMessage.id)}
                                className="mt-2 text-gray-400 transition-colors hover:text-white"
                                aria-label="Copy message"
                              >
                                {copiedMessageId === nextMessage.id ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>

                              <button
                                onClick={() => handleRetry(index)}
                                disabled={retryingMessageIndex === index}
                                className="mt-2 ml-2 text-gray-400 transition-colors hover:text-white disabled:opacity-50"
                                aria-label="Retry message"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Old streaming section removed - now handled by unified section above */}

                      {/* Processing indicator attached to last user message */}
                      {isLastUserMessage && isLoading && !streamingContent && (
                        <motion.div
                          ref={processingIndicatorRef}
                          className="mt-6"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{
                            duration: 0.4,
                            ease: [0.16, 1, 0.3, 1]
                          }}
                        >
                          <ProcessingIndicator />
                        </motion.div>
                      )}

                      {/* Action buttons for assistant messages */}
                      {message.role === "assistant" && (
                        <>
                          <button
                            onClick={() => handleCopyMessage(message.content, message.id)}
                            className="mt-2 text-gray-400 transition-colors hover:text-white"
                            aria-label="Copy message"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>

                          {index > 0 && messages[index - 1].role === "user" && (
                            <button
                              onClick={() => handleRetry(index - 1)}
                              disabled={retryingMessageIndex === index - 1}
                              className="mt-2 ml-2 text-gray-400 transition-colors hover:text-white disabled:opacity-50"
                              aria-label="Retry message"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    </motion.div>
                    {/* Spacer for response - only when needed, prevents jumping */}
                    {needsSpacer && (
                      <div 
                        key={`spacer-${message.id}`}
                        style={{ height: spacerHeight, minHeight: spacerHeight }}
                        className="w-full flex-shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    </>
                  );
                })}
              </AnimatePresence>

              {/* Scroll anchor at bottom */}
              <div ref={messagesEndRef} />
            </motion.div>
          )}
        </div>
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ 
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1]
          }}
          onClick={scrollToBottom}
          className="fixed bottom-24 right-8 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#2e2f37] bg-[#1c1d21] shadow-linear-md transition-all hover:bg-[#23242a]"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-5 w-5 text-gray-400" />
        </motion.button>
      )}

      {/* Input Area - fixed at bottom, outside scroll container */}
      <div className="flex-shrink-0">
        <ChatInput onSend={(content, searchMode) => handleSendMessage(content, searchMode || false)} />
      </div>
    </div>
  );
}

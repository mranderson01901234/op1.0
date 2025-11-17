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

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Copy, Check, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { ChatInput } from "./chat-input";
import { MessageRenderer } from "./message-renderer";
import { WelcomeScreen } from "./welcome-screen";
import { ProcessingIndicator } from "../ui/processing-indicator";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { saveConversation, getConversations, getConversation } from "@/lib/storage";
import { generateConversationTitle } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Message, Conversation } from "@/lib/types";

export function EnhancedChatInterface() {
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

  // Monitor scroll position
  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;

    container.addEventListener("scroll", checkScrollPosition);
    return () => container.removeEventListener("scroll", checkScrollPosition);
  }, [checkScrollPosition]);

  // ⚠️ CRITICAL: User Message Positioning Logic
  // This useLayoutEffect positions user messages synchronously before paint to prevent flashing.
  // DO NOT refactor without reading SCROLL_POSITIONING_LOGIC.md
  // Key behaviors:
  // - Uses flushSync to ensure state updates happen before paint
  // - Sets isShortChatRef based on viewport usage (threshold: 0.5)
  // - For short chats: scrolls to bottom, no spacer
  // - For long chats: adds spacer (~75% viewport, max 800px) and positions ~120px from top
  // On new user message - position it correctly IMMEDIATELY (synchronously before paint)
  useLayoutEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user" && lastMessage.id === lastUserMessageId.current) {
        // Skip if already positioned this message
        if (positionedMessageIdsRef.current.has(lastMessage.id)) {
          return;
        }
        
        // Set positioning state to show processing indicator
        setPositioningMessageId(lastMessage.id);
        
        const container = messagesRef.current;
        if (!container) {
          setPositioningMessageId(null);
          return;
        }
        
        const messageElement = container.querySelector(`[data-message-id="${lastMessage.id}"]`) as HTMLElement;
        if (!messageElement) {
          setPositioningMessageId(null);
          return;
        }
        
        const { scrollHeight, clientHeight } = container;
        const viewportUsage = scrollHeight / clientHeight;
        
        // Temporarily disable smooth scrolling for instant positioning
        const originalScrollBehavior = container.style.scrollBehavior;
        container.style.scrollBehavior = 'auto';
        
        if (viewportUsage <= 0.5) {
          // Short chat - no spacer needed, scroll to bottom immediately
          isShortChatRef.current = true;
          flushSync(() => {
            setSpacerHeight(0);
          });
          // Re-query message element after flushSync in case DOM changed
          const updatedMessageElement = container.querySelector(`[data-message-id="${lastMessage.id}"]`) as HTMLElement;
          if (updatedMessageElement) {
            // Scroll to bottom synchronously - no RAF delay
            messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
            // Mark as positioned and show message
            positionedMessageIdsRef.current.add(lastMessage.id);
            // Use flushSync to ensure state update happens before paint
            flushSync(() => {
              setPositioningMessageId(null);
            });
          }
        } else {
          // Long chat - use spacer and position maintenance
          isShortChatRef.current = false;
          const offsetFromTop = 120;
          const spaceForResponse = Math.min(clientHeight * 0.75, 800);
          
          // Force spacer to render synchronously before positioning
          flushSync(() => {
            setSpacerHeight(spaceForResponse);
          });
          
          // Re-query message element after flushSync - spacer may have changed layout
          const updatedMessageElement = container.querySelector(`[data-message-id="${lastMessage.id}"]`) as HTMLElement;
          if (updatedMessageElement) {
            // Recalculate position with updated layout
            const messageOffsetTop = (updatedMessageElement as HTMLElement).offsetTop;
            const targetScrollTop = messageOffsetTop - offsetFromTop;
            container.scrollTop = Math.max(0, targetScrollTop);
            // Mark as positioned and show message
            positionedMessageIdsRef.current.add(lastMessage.id);
            // Use flushSync to ensure state update happens before paint
            flushSync(() => {
              setPositioningMessageId(null);
            });
          }
        }
        
        // Restore scroll behavior after positioning
        container.style.scrollBehavior = originalScrollBehavior;
      }
    }
  }, [messages.length]);

  // ⚠️ CRITICAL: Short Response Detection & Streaming Scroll Logic
  // This useEffect detects short responses early and adjusts spacer to prevent jumping.
  // DO NOT refactor without reading SCROLL_POSITIONING_LOGIC.md
  // Key behaviors:
  // - Monitors response length during streaming (checks after 3 chunks or 500ms)
  // - If response < 200 chars, reduces spacer from ~75% to ~20% viewport
  // - Adjusts scroll position when spacer is reduced
  // Thresholds are tuned - changing them may cause regressions
  // During streaming - throttled auto-scroll until user message is about to scroll out of view
  useEffect(() => {
    if (isStreaming && streamingContent) {
      // Detect short responses early to prevent unnecessary scrolling
      // Check after a few chunks if response is still short, then reduce spacer
      if (!isShortChatRef.current && !shortResponseDetectedRef.current && spacerHeight > 0) {
        // Set streaming start time on first chunk
        if (streamingStartTimeRef.current === 0) {
          streamingStartTimeRef.current = Date.now();
        }
        
        responseLengthCheckCountRef.current += 1;
        const contentLength = streamingContent.length;
        const timeStreaming = Date.now() - streamingStartTimeRef.current;
        
        // After 3 chunks or 500ms, check if response is still short
        if (responseLengthCheckCountRef.current >= 3 || timeStreaming > 500) {
          // If response is still short (< 200 chars), reduce spacer to prevent jump
          if (contentLength < 200) {
            shortResponseDetectedRef.current = true;
            // Reduce spacer significantly to prevent scroll jump
            const container = messagesRef.current;
            if (container) {
              const { clientHeight } = container;
              // Use much smaller spacer for short responses
              const reducedSpacer = Math.min(clientHeight * 0.2, 200);
              flushSync(() => {
                setSpacerHeight(reducedSpacer);
              });
              // Adjust scroll position to compensate
              const userMessageElement = container.querySelector(`[data-message-id="${lastUserMessageId.current}"]`) as HTMLElement;
              if (userMessageElement) {
                const containerRect = container.getBoundingClientRect();
                const messageRect = userMessageElement.getBoundingClientRect();
                const messageTopRelativeToViewport = messageRect.top - containerRect.top;
                const offsetFromTop = 120;
                const targetScrollTop = userMessageElement.offsetTop - offsetFromTop;
                container.scrollTop = Math.max(0, targetScrollTop);
              }
            }
          }
        }
      }
      
      // For short chats, use stable scroll-to-bottom logic with throttling
      if (isShortChatRef.current) {
        const container = messagesRef.current;
        if (!container) return;
        
        const { scrollHeight } = container;
        const now = Date.now();
        const timeSinceLastCheck = now - lastScrollCheckRef.current;
        
        // Only scroll if content actually grew and enough time has passed
        // This prevents unnecessary scrolls that cause flashing
        if (timeSinceLastCheck >= 100 && scrollHeight > lastScrollHeightRef.current) {
          lastScrollCheckRef.current = now;
          lastScrollHeightRef.current = scrollHeight;
          // Use stable scroll function that only scrolls if near bottom
          requestAnimationFrame(() => {
            scrollToBottomIfNear();
          });
        } else if (scrollHeight > lastScrollHeightRef.current) {
          // Update height even if we don't scroll
          lastScrollHeightRef.current = scrollHeight;
        }
        return;
      }
      
      // Check if we should continue auto-scrolling
      if (!shouldAutoScrollRef.current) {
        return; // User message is about to go out of view, stop scrolling
      }

      // Throttle scroll updates to avoid performance issues during rapid streaming
      const now = Date.now();
      const timeSinceLastCheck = now - lastScrollCheckRef.current;
      
      if (timeSinceLastCheck < scrollThrottleMs) {
        // Too soon since last check, skip this update
        return;
      }

      lastScrollCheckRef.current = now;

      // Incremental scroll during streaming - check position and scroll safely
      const performScroll = () => {
        const container = messagesRef.current;
        if (!container || !shouldAutoScrollRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        const maxScroll = scrollHeight - clientHeight;
        const distanceToBottom = maxScroll - scrollTop;

        // If already at bottom (within 5px), no need to scroll
        if (distanceToBottom <= 5) {
          return;
        }

        // Check if user message is about to scroll out of view BEFORE scrolling
        if (lastUserMessageId.current) {
          const messageElement = container.querySelector(`[data-message-id="${lastUserMessageId.current}"]`) as HTMLElement;
          if (messageElement) {
            const containerRect = container.getBoundingClientRect();
            const messageRect = messageElement.getBoundingClientRect();
            const messageTopRelativeToViewport = messageRect.top - containerRect.top;
            
            // Stop scrolling if user message is about to scroll out of view
            if (messageTopRelativeToViewport <= 100) {
              shouldAutoScrollRef.current = false;
              return;
            }

            // Calculate safe scroll amount - don't scroll more than would push user message too close to top
            // Leave at least 150px buffer from the threshold
            const safeScrollDistance = messageTopRelativeToViewport - 150;
            const scrollAmount = Math.min(distanceToBottom, Math.max(0, safeScrollDistance));
            
            if (scrollAmount > 0) {
              container.scrollTop = scrollTop + scrollAmount;
            } else {
              // Can't scroll safely without pushing user message out of view
              shouldAutoScrollRef.current = false;
            }
            return;
          }
        }

        // If we can't find the user message, scroll incrementally (not all the way)
        // This prevents overscrolling and allows us to check again next time
        const incrementalScroll = Math.min(distanceToBottom, 100); // Scroll max 100px at a time
        container.scrollTop = scrollTop + incrementalScroll;
      };

      // Use single RAF for better performance
      requestAnimationFrame(performScroll);
    } else {
      // Stop scrolling when not streaming
      if (!isStreaming && !streamingContent) {
        // Only clean up when streaming has fully stopped (no content and not streaming)
        // But only reset shouldAutoScrollRef if we're not about to start a new message
        // Check if last message is an assistant message (streaming completed) vs user message (new message starting)
        const lastMessage = messages[messages.length - 1];
        const isStreamingCompleted = lastMessage && lastMessage.role === "assistant";
        
        if (scrollAnimationFrameRef.current !== null) {
          cancelAnimationFrame(scrollAnimationFrameRef.current);
          scrollAnimationFrameRef.current = null;
        }
        
        // Reset throttle timer
        lastScrollCheckRef.current = 0;
        
        // Reset streaming start time when streaming stops
        streamingStartTimeRef.current = 0;
        
        // Only reset shouldAutoScrollRef when streaming has actually completed (assistant message added)
        // Don't reset when we're just starting a new message (user message added)
        if (isStreamingCompleted) {
          shouldAutoScrollRef.current = false;
        }
      }
    }
  }, [streamingContent, isStreaming, messages, spacerHeight]);

  // Initial load - start at bottom
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [currentConversationId]);

  // ⚠️ CRITICAL: Response Completion Positioning Logic
  // This useLayoutEffect locks user message position when response completes to prevent jumping.
  // DO NOT refactor without reading SCROLL_POSITIONING_LOGIC.md
  // Key behaviors:
  // - For short chats: Skips all positioning logic (no adjustments needed)
  // - For long chats: Removes spacer and adjusts scroll to maintain user message position
  // - Uses flushSync to ensure positioning happens before paint
  // When response completes, ensure user message stays in place (synchronously before paint)
  useLayoutEffect(() => {
    if (messages.length >= 2) {
      const lastMessage = messages[messages.length - 1];
      const secondLastMessage = messages[messages.length - 2];

      // If assistant message just added (response completed)
      if (lastMessage.role === "assistant" && secondLastMessage.role === "user" && secondLastMessage.id === lastUserMessageId.current) {
        const container = messagesRef.current;
        if (!container) return;

        // Prevent double adjustments
        if (positionLockedRef.current) return;

        // For short chats, skip all positioning logic - scroll was already handled before message was added
        if (isShortChatRef.current) {
          return;
        }

        positionLockedRef.current = true;

        // Find the user message element BEFORE any DOM changes
        const userMessageElement = container.querySelector(`[data-message-id="${secondLastMessage.id}"]`) as HTMLElement;
        if (!userMessageElement) {
          positionLockedRef.current = false;
          return;
        }

        // Positioning state should already be set when message was added (in handleSendMessage)
        // But verify it's set, and if not, set it now
        if (positioningResponseId !== lastMessage.id) {
          flushSync(() => {
            setPositioningResponseId(lastMessage.id);
          });
        }

        // Lock the user message position BEFORE removing spacer or making any changes
        const containerRect = container.getBoundingClientRect();
        const messageRect = userMessageElement.getBoundingClientRect();
        const messageTopRelativeToViewport = messageRect.top - containerRect.top;
        const messageOffsetTop = userMessageElement.offsetTop;
        const currentScrollTop = container.scrollTop;

        // Store target position - we want to maintain the visual position of the message top
        const targetMessageTop = messageTopRelativeToViewport;
        const targetMessageOffsetTop = messageOffsetTop;

        // Temporarily disable smooth scrolling for instant positioning
        const originalScrollBehavior = container.style.scrollBehavior;
        container.style.scrollBehavior = 'auto';

        // Remove spacer synchronously
        flushSync(() => {
          setSpacerHeight(0);
        });

        // Re-query elements after spacer removal
        const updatedUserMessageElement = container.querySelector(`[data-message-id="${secondLastMessage.id}"]`) as HTMLElement;
        if (!updatedUserMessageElement) {
          positionLockedRef.current = false;
          flushSync(() => {
            setPositioningResponseId(null);
          });
          container.style.scrollBehavior = originalScrollBehavior;
          return;
        }

        // Find the completed assistant response element (reuse container from above)
        const updatedUserMessageContainer = updatedUserMessageElement.querySelector('.relative.w-full.max-w-full') as HTMLElement;
        const completedResponseElement = updatedUserMessageContainer?.querySelector('.mt-6.group') as HTMLElement;

        // Measure new positions
        const newMessageRect = updatedUserMessageElement.getBoundingClientRect();
        const newContainerRect = container.getBoundingClientRect();
        const newMessageTopRelativeToViewport = newMessageRect.top - newContainerRect.top;
        const newMessageOffsetTop = updatedUserMessageElement.offsetTop;

        // Calculate how much the message moved
        const visualDifference = newMessageTopRelativeToViewport - targetMessageTop;
        const offsetDifference = newMessageOffsetTop - targetMessageOffsetTop;

        // Only adjust if message is still visible in viewport
        const isMessageVisible = newMessageTopRelativeToViewport >= -100 && 
                                newMessageTopRelativeToViewport <= container.clientHeight + 100;

        // Adjust scroll to compensate for movement synchronously
        if (isMessageVisible) {
          const currentMeasuredScrollTop = container.scrollTop;
          
          if (Math.abs(visualDifference) > 0.05) {
            container.scrollTop = currentMeasuredScrollTop - visualDifference;
          } else if (Math.abs(offsetDifference) > 0.05) {
            container.scrollTop = currentMeasuredScrollTop - offsetDifference;
          }
        }

        // Restore scroll behavior and show response
        container.style.scrollBehavior = originalScrollBehavior;
        
        // Mark as positioned and show response
        flushSync(() => {
          setPositioningResponseId(null);
        });
        
        // Reset lock after adjustment completes
        positionLockedRef.current = false;
      }
    }
  }, [messages.length]);

  // Load last conversation on mount
  useEffect(() => {
    const conversations = getConversations();
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
  }, []);

  // Listen for load-conversation events from sidebar
  useEffect(() => {
    const handleLoadConversation = (event: CustomEvent<string>) => {
      const conversationId = event.detail;
      const conversation = getConversation(conversationId);
      
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
  }, []);

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

    saveConversation(conversation);
    // Dispatch event to notify sidebar of conversation save
    window.dispatchEvent(new CustomEvent('conversation-saved'));
  }, [currentConversationId]);

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

  const handleRetry = async (messageIndex: number) => {
    if (messageIndex < 0 || messageIndex >= messages.length) return;

    const userMessage = messages[messageIndex];
    if (userMessage.role !== "user") return;

    // Remove messages from this point forward
    const messagesToKeep = messages.slice(0, messageIndex);
    setMessages(messagesToKeep);
    setRetryingMessageIndex(messageIndex);

    // Retry with the user's message
    await handleSendMessage(userMessage.content, messagesToKeep);
    setRetryingMessageIndex(null);
  };

  const handleSendMessage = async (content: string, previousMessages: Message[] = messages) => {
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
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
    shouldAutoScrollRef.current = true;
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

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
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
                const assistantMessage: Message = {
                  id: `msg_${Date.now()}`,
                  role: "assistant",
                  content: accumulatedContent,
                  timestamp: new Date(),
                };
                // ⚠️ CRITICAL: Response completion positioning state
                // Only set positioningResponseId for long chats - short chats skip positioning to prevent flashing.
                // For short chats, scroll to bottom before adding message to prevent jump.
                // DO NOT set positioningResponseId for short chats - this causes flashing.
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
                return;
              }

              try {
                const parsed = JSON.parse(data);
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
    <div className="flex h-full flex-col">
      {/* Messages Area - grows to fill space */}
      <div
        ref={messagesRef}
        className="flex-1 overflow-y-auto px-8 py-6"
      >
        <div className="mx-auto w-full max-w-[720px]">
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
                      {/* Completed assistant response attached to user message */}
                      {message.role === "user" && hasAssistantReply && (
                        <div 
                          className="mt-6 group"
                          style={{
                            opacity: positioningResponseId === nextMessage.id ? 0 : 1,
                            pointerEvents: positioningResponseId === nextMessage.id ? 'none' : undefined
                          }}
                        >
                          <MessageRenderer content={nextMessage.content} isUser={false} />

                          {/* Action buttons for completed assistant response */}
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
                        </div>
                      )}

                      {/* Streaming response attached to last user message */}
                      {isLastUserMessage && (streamingContent || isLoading) && streamingContent && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ 
                            duration: 0.5,
                            ease: [0.16, 1, 0.3, 1]
                          }}
                          className="mt-6"
                        >
                          <MessageRenderer content={streamingContent} isUser={false} />
                        </motion.div>
                      )}

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
        <ChatInput onSend={(content) => handleSendMessage(content)} />
      </div>
    </div>
  );
}

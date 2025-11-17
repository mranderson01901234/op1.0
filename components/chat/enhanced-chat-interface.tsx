"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Copy, Check, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { ChatInput } from "./chat-input";
import { MessageRenderer } from "./message-renderer";
import { WelcomeScreen } from "./welcome-screen";
import { MessageSkeleton } from "../ui/loading-skeleton";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { saveConversation, getConversations } from "@/lib/storage";
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

  // On new user message - position it correctly after render
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user" && lastMessage.id === lastUserMessageId.current) {
        requestAnimationFrame(() => {
          const container = messagesRef.current;
          if (!container) return;
          
          const messageElement = container.querySelector(`[data-message-id="${lastMessage.id}"]`) as HTMLElement;
          if (!messageElement) return;
          
          const { scrollHeight, clientHeight } = container;
          const viewportUsage = scrollHeight / clientHeight;
          
          // Get message position
          const containerRect = container.getBoundingClientRect();
          const messageRect = messageElement.getBoundingClientRect();
          const messageTopRelativeToViewport = messageRect.top - containerRect.top;
          const messageBottomRelativeToViewport = messageRect.bottom - containerRect.top;
          
          if (viewportUsage <= 0.5) {
            // Short chat - no spacer needed, just scroll to bottom and let natural scrolling happen
            isShortChatRef.current = true;
            setSpacerHeight(0); // No spacer for short chats
            // Always scroll to bottom when user sends message (user just sent it, so they want to see it)
            requestAnimationFrame(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
            });
          } else {
            // Long chat - use spacer and position maintenance
            isShortChatRef.current = false;
            // Long chat - position message in upper portion with space below for response
            const offsetFromTop = 120; // Desired position from top
            const spaceForResponse = Math.min(clientHeight * 0.75, 800); // 75% of viewport or max 800px for more space
            
            // Use offsetTop to get message's position relative to container (more reliable)
            // offsetTop gives position relative to offsetParent, which is the scrollable container
            const messageOffsetTop = (messageElement as HTMLElement).offsetTop;
            
            // Calculate target scroll position: message should be at offsetFromTop from top
            const targetScrollTop = messageOffsetTop - offsetFromTop;
            
            // Scroll to position message correctly
            container.scrollTop = Math.max(0, targetScrollTop);
            setSpacerHeight(spaceForResponse);
          }
        });
      }
    }
  }, [messages.length, scrollToBottom]);

  // During streaming - throttled auto-scroll until user message is about to scroll out of view
  useEffect(() => {
    if (isStreaming && streamingContent) {
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
        
        // Only reset shouldAutoScrollRef when streaming has actually completed (assistant message added)
        // Don't reset when we're just starting a new message (user message added)
        if (isStreamingCompleted) {
          shouldAutoScrollRef.current = false;
        }
      }
    }
  }, [streamingContent, isStreaming, messages]);

  // Initial load - start at bottom
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [currentConversationId]);

  // When response completes, ensure user message stays in place
  useEffect(() => {
    if (messages.length >= 2) {
      const lastMessage = messages[messages.length - 1];
      const secondLastMessage = messages[messages.length - 2];

      // If assistant message just added (response completed)
      if (lastMessage.role === "assistant" && secondLastMessage.role === "user" && secondLastMessage.id === lastUserMessageId.current) {
        const container = messagesRef.current;
        if (!container) return;

        // Check viewport usage first to determine if this is a short chat
        const { scrollHeight, clientHeight } = container;
        const viewportUsage = scrollHeight / clientHeight;
        const isShortChat = viewportUsage <= 0.5;

        // Remove spacer when response completes
        setSpacerHeight(0);

        // For short chats, don't do any scroll adjustments - just stay where we are
        if (isShortChat || isShortChatRef.current) {
          return; // No position maintenance needed for short chats
        }

        // For long chats only - find the user message element and maintain position
        const userMessageElement = container.querySelector(`[data-message-id="${secondLastMessage.id}"]`) as HTMLElement;
        if (!userMessageElement) return;

        // Get current position of user message relative to viewport
        const containerRect = container.getBoundingClientRect();
        const messageRect = userMessageElement.getBoundingClientRect();
        const messageTopRelativeToViewport = messageRect.top - containerRect.top;

        // Store this position
        const targetMessageTop = messageTopRelativeToViewport;
        const currentScrollTop = container.scrollTop;

        // For long chats, maintain user message position
        // Wait for DOM to update (spacer removal)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Re-measure after spacer removal
            const newMessageRect = userMessageElement.getBoundingClientRect();
            const newContainerRect = container.getBoundingClientRect();
            const newMessageTopRelativeToViewport = newMessageRect.top - newContainerRect.top;
            const difference = newMessageTopRelativeToViewport - targetMessageTop;

            // Adjust scroll to keep message in exact same position
            if (Math.abs(difference) > 1) {
              container.scrollTop = currentScrollTop - difference;
            }
          });
        });
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
    } else {
      // Create new conversation
      setCurrentConversationId(`conv_${Date.now()}`);
    }
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
    setCurrentConversationId(`conv_${Date.now()}`);
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

    // Reset auto-scroll flag for new message
    shouldAutoScrollRef.current = true;
    // Reset scroll height tracking for new message
    lastScrollHeightRef.current = 0;

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
            <div className="flex flex-col space-y-6">
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

                  return (
                    <>
                    <motion.div
                      key={message.id}
                      data-message-id={message.id}
                      ref={isLastUserMessage ? lastUserMessageRef : null}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        "group relative mb-6 px-6",
                        message.role === "user" ? "flex justify-end" : "flex justify-start"
                      )}
                    >
                    <div className="relative w-full max-w-full">
                      <MessageRenderer
                        content={message.content}
                        isUser={message.role === "user"}
                      />

                      {/* Completed assistant response attached to user message */}
                      {message.role === "user" && hasAssistantReply && (
                        <div className="mt-6 group">
                          <MessageRenderer content={nextMessage.content} isUser={false} />

                          {/* Action buttons for completed assistant response */}
                          <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => handleCopyMessage(nextMessage.content, nextMessage.id)}
                              className="flex items-center gap-1.5 rounded-md bg-[#1c1d21] px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-[#23242a] hover:text-white"
                              aria-label="Copy message"
                            >
                              {copiedMessageId === nextMessage.id ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  Copy
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleRetry(index)}
                              disabled={retryingMessageIndex === index}
                              className="flex items-center gap-1.5 rounded-md bg-[#1c1d21] px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-[#23242a] hover:text-white disabled:opacity-50"
                              aria-label="Retry message"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Retry
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Streaming response attached to last user message */}
                      {isLastUserMessage && (streamingContent || isLoading) && streamingContent && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-6"
                        >
                          <MessageRenderer content={streamingContent} isUser={false} />
                        </motion.div>
                      )}

                      {/* Loading skeleton attached to last user message */}
                      {isLastUserMessage && isLoading && !streamingContent && (
                        <div className="mt-6">
                          <MessageSkeleton />
                        </div>
                      )}

                      {/* Action buttons for assistant messages */}
                      {message.role === "assistant" && (
                        <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => handleCopyMessage(message.content, message.id)}
                            className="flex items-center gap-1.5 rounded-md bg-[#1c1d21] px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-[#23242a] hover:text-white"
                            aria-label="Copy message"
                          >
                            {copiedMessageId === message.id ? (
                              <>
                                <Check className="h-3 w-3" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Copy
                              </>
                            )}
                          </button>

                          {index > 0 && messages[index - 1].role === "user" && (
                            <button
                              onClick={() => handleRetry(index - 1)}
                              disabled={retryingMessageIndex === index - 1}
                              className="flex items-center gap-1.5 rounded-md bg-[#1c1d21] px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-[#23242a] hover:text-white disabled:opacity-50"
                              aria-label="Retry message"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Retry
                            </button>
                          )}
                        </div>
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
            </div>
          )}
        </div>
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
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

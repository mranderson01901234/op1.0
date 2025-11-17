import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createGeminiClient } from "@/lib/gemini-client";
import { MODEL_NAME } from "@/lib/gemini-config";
import { checkRateLimit } from "@/lib/rate-limiter";
import { tools } from "@/lib/gemini-tools";
import { sendToolCall, isAgentConnected } from "@/lib/redis/tool-call";
import { braveSearch, formatSearchResultsForLLM, type BraveSearchResult } from "@/lib/search/braveSearch";
import { shouldPerformSearch, cleanSearchQuery } from "@/lib/search/detectSearchIntent";

// API configuration
const MAX_HISTORY_LENGTH = 50;
const MAX_FUNCTION_CALL_ROUNDS = 10; // Allow more rounds for complex agentic workflows (ReAct pattern)

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Rate limiting
    const identifier = req.headers.get("x-forwarded-for") || req.ip || userId;

    if (!checkRateLimit(identifier)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in a minute." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60"
          }
        }
      );
    }

    // Parse request body
    const { messages, editorContext, searchMode } = await req.json();

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request: messages array required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if agent is connected
    const agentConnected = await isAgentConnected(userId);

    // Initialize model with tools if agent is connected
    const model = createGeminiClient(agentConnected ? { tools } : undefined);

    // Trim conversation history
    const trimmedMessages = messages.length > MAX_HISTORY_LENGTH
      ? messages.slice(-MAX_HISTORY_LENGTH)
      : messages;

    // Convert messages to Gemini format (excluding the last message which we'll send separately)
    let history = trimmedMessages.slice(0, -1).map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Ensure history starts with user message - if not, remove leading model messages
    while (history.length > 0 && history[0].role === "model") {
      history = history.slice(1);
    }

    // Also ensure history has alternating user/model messages (no consecutive same roles)
    const cleanedHistory: any[] = [];
    for (let i = 0; i < history.length; i++) {
      const current = history[i];
      const last = cleanedHistory[cleanedHistory.length - 1];

      // Skip if same role as previous message
      if (last && last.role === current.role) {
        continue;
      }

      cleanedHistory.push(current);
    }

    // Start chat with cleaned history
    const chat = model.startChat({ history: cleanedHistory });

    // Get last user message
    const lastMessage = trimmedMessages[trimmedMessages.length - 1];

    if (lastMessage.role !== "user") {
      return new Response(
        JSON.stringify({ error: "Last message must be from user" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Detect if we should perform web search
    console.log(`[SEARCH-DEBUG] Checking search intent:`, {
      query: lastMessage.content,
      searchMode,
      manualMode: searchMode
    });

    const needsSearch = shouldPerformSearch(lastMessage.content, searchMode);
    console.log(`[SEARCH-DEBUG] Should perform search:`, needsSearch);

    let searchResults: BraveSearchResult[] = [];

    if (needsSearch) {
      console.log(`[SEARCH] Performing web search for: "${lastMessage.content}"`);
      const cleanedQuery = cleanSearchQuery(lastMessage.content);
      const searchResponse = await braveSearch(cleanedQuery);

      if (searchResponse.error) {
        console.error(`[SEARCH] Error:`, searchResponse.error);
      } else {
        searchResults = searchResponse.results;
        console.log(`[SEARCH] Found ${searchResults.length} results`);
      }
    }

    // Enhance last message with editor context if available
    let enhancedMessage = lastMessage.content;
    
    // Check for active tab (URL or file) first
    if (editorContext && editorContext.activeTab) {
      const tab = editorContext.activeTab;
      if (tab.type === 'url' && tab.url) {
        // User is viewing a web page in the split view
        enhancedMessage = `${lastMessage.content}\n\n---EDITOR CONTEXT---\nCurrently viewing web page in split view:\nURL: ${tab.url}\nTitle: ${tab.title}\n\nIMPORTANT: The user is looking at this web page in their editor's split view (right pane). When they say "summarize this page", "what's on this page", "tell me about this page", or reference "this page", they mean the web page currently displayed at ${tab.url}. You should acknowledge that you can see they have this page open and provide a summary or information about it based on the URL and title. If you need more details, you can reference the URL directly.`;
      } else if (tab.type === 'file' && tab.path && editorContext.activeFile) {
        // User is viewing a file tab
        const { path, content, isDirty } = editorContext.activeFile;
        const dirtyMarker = isDirty ? " (unsaved changes)" : "";
        enhancedMessage = `${lastMessage.content}\n\n---EDITOR CONTEXT---\nCurrently viewing file: ${path}${dirtyMarker}\n\nFile content:\n\`\`\`\n${content}\n\`\`\`\n\nNote: The user is looking at this file in their editor. If they ask to "edit this file" or reference "this file", they mean ${path}. You can use the write_file tool to make changes.`;
      }
    } else if (editorContext && editorContext.activeFile) {
      // Fallback to activeFile if no activeTab
      const { path, content, isDirty } = editorContext.activeFile;
      const dirtyMarker = isDirty ? " (unsaved changes)" : "";
      enhancedMessage = `${lastMessage.content}\n\n---EDITOR CONTEXT---\nCurrently viewing file: ${path}${dirtyMarker}\n\nFile content:\n\`\`\`\n${content}\n\`\`\`\n\nNote: The user is looking at this file in their editor. If they ask to "edit this file" or reference "this file", they mean ${path}. You can use the write_file tool to make changes.`;
    } else if (editorContext && editorContext.openFiles.length > 0) {
      const fileList = editorContext.openFiles.map((f: { path: string; isDirty?: boolean }) => `- ${f.path}${f.isDirty ? ' (unsaved)' : ''}`).join('\n');
      enhancedMessage = `${lastMessage.content}\n\n---EDITOR CONTEXT---\nOpen files in editor:\n${fileList}`;
    }

    // Add search results to the message if available
    if (searchResults.length > 0) {
      const searchContext = formatSearchResultsForLLM(searchResults);
      enhancedMessage = `${enhancedMessage}\n\n---WEB SEARCH RESULTS---\nYou have access to current web search results. The top result is automatically displayed in the split view (right pane) for visual reference, similar to how code files are displayed. Use inline citations [1], [2], [3], etc. to reference these sources in your response. Synthesize the information naturally and cite sources for factual claims.\n\n${searchContext}\n\nRemember to:\n- Use numbered citations [1], [2] in your response\n- Synthesize information from multiple sources\n- Cite sources for all factual claims\n- Be concise and accurate\n- Note that users can see the web pages in the split view, similar to how they see code files`;
    }

    // Stream response with function calling support
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send search results to client first if available
          if (searchResults.length > 0) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({
                type: 'search_results',
                results: searchResults
              })}\n\n`
            ));
          }

          let result = await chat.sendMessageStream(enhancedMessage);
          let functionCallRounds = 0;

          // Handle function calling loop
          while (functionCallRounds < MAX_FUNCTION_CALL_ROUNDS) {
            let hasFunctionCalls = false;
            let functionResults: any[] = [];

            // Process the stream
            for await (const chunk of result.stream) {
              const functionCalls = chunk.functionCalls();

              if (functionCalls && functionCalls.length > 0) {
                hasFunctionCalls = true;

                // Execute each function call
                for (const call of functionCalls) {
                  console.log(`Executing tool: ${call.name}`, call.args);

                  // Send status update to client
                  controller.enqueue(encoder.encode(
                    `data: ${JSON.stringify({
                      type: 'tool_call',
                      tool: call.name,
                      params: call.args
                    })}\n\n`
                  ));

                  try {
                    // Execute tool on local agent
                    const toolResult = await sendToolCall(userId, {
                      tool: call.name,
                      params: call.args,
                    });

                    console.log(`Tool ${call.name} result:`, toolResult);

                    // Format result for Gemini
                    functionResults.push({
                      functionResponse: {
                        name: call.name,
                        response: toolResult,
                      },
                    });

                    // Send result to client
                    controller.enqueue(encoder.encode(
                      `data: ${JSON.stringify({
                        type: 'tool_result',
                        tool: call.name,
                        params: call.args,
                        result: toolResult
                      })}\n\n`
                    ));
                  } catch (error: any) {
                    console.error(`Tool ${call.name} error:`, error);

                    // Send error as function result
                    functionResults.push({
                      functionResponse: {
                        name: call.name,
                        response: {
                          success: false,
                          error: error.message || "Tool execution failed",
                        },
                      },
                    });

                    // Send error to client
                    controller.enqueue(encoder.encode(
                      `data: ${JSON.stringify({
                        type: 'tool_error',
                        tool: call.name,
                        error: error.message
                      })}\n\n`
                    ));
                  }
                }
              } else {
                // Regular text chunk
                const text = chunk.text();
                if (text) {
                  controller.enqueue(encoder.encode(
                    `data: ${JSON.stringify({ content: text })}\n\n`
                  ));
                }
              }
            }

            // If there were function calls, send results back to model
            if (hasFunctionCalls && functionResults.length > 0) {
              functionCallRounds++;
              result = await chat.sendMessageStream(functionResults);
            } else {
              // No more function calls, we're done
              break;
            }
          }

          // Send completion signal
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (streamError) {
          console.error("Streaming error:", streamError);

          const errorData = `data: ${JSON.stringify({
            error: "Streaming failed. Please try again."
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
      cancel() {
        console.log("Stream cancelled by client");
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });

  } catch (error: any) {
    console.error("Chat API error:", error);

    return new Response(
      JSON.stringify({
        error: error?.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

// Health check endpoint
export async function GET() {
  return new Response(
    JSON.stringify({
      status: "ok",
      model: MODEL_NAME,
      tools_enabled: true,
      timestamp: new Date().toISOString()
    }),
    {
      headers: { "Content-Type": "application/json" }
    }
  );
}

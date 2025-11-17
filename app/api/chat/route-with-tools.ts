import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createGeminiClient } from "@/lib/gemini-client";
import { MODEL_NAME } from "@/lib/gemini-config";
import { checkRateLimit } from "@/lib/rate-limiter";
import { tools } from "@/lib/gemini-tools";
import { sendToolCall, isAgentConnected } from "@/lib/redis/tool-call";

// API configuration
const MAX_HISTORY_LENGTH = 50;
const MAX_FUNCTION_CALL_ROUNDS = 5; // Prevent infinite loops

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
    const { messages } = await req.json();

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

    // Convert messages to Gemini format
    let history = trimmedMessages.slice(0, -1).map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Ensure history starts with user message
    while (history.length > 0 && history[0].role === "model") {
      history = history.slice(1);
    }

    // Start chat
    const chat = model.startChat({ history });

    // Get last user message
    const lastMessage = trimmedMessages[trimmedMessages.length - 1];

    if (lastMessage.role !== "user") {
      return new Response(
        JSON.stringify({ error: "Last message must be from user" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Stream response with function calling support
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let result = await chat.sendMessageStream(lastMessage.content);
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

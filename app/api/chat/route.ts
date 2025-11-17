import { NextRequest } from "next/server";
import { createGeminiClient } from "@/lib/gemini-client";
import { MODEL_NAME } from "@/lib/gemini-config";
import { checkRateLimit } from "@/lib/rate-limiter";

// API configuration
const MAX_HISTORY_LENGTH = 50; // Limit conversation history to prevent token overflow

export async function POST(req: NextRequest) {
  try {
    // Rate limiting (20 requests per minute)
    const identifier = req.headers.get("x-forwarded-for") || req.ip || "anonymous";

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

    // Initialize the model with centralized configuration
    const model = createGeminiClient();

    // Trim conversation history if too long
    const trimmedMessages = messages.length > MAX_HISTORY_LENGTH
      ? messages.slice(-MAX_HISTORY_LENGTH)
      : messages;

    // Convert messages to Gemini format (exclude last message for history)
    let history = trimmedMessages.slice(0, -1).map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Ensure history starts with user message (Gemini requirement)
    while (history.length > 0 && history[0].role === "model") {
      history = history.slice(1);
    }

    // Start chat with conversation history
    const chat = model.startChat({ history });

    // Get the last user message
    const lastMessage = trimmedMessages[trimmedMessages.length - 1];

    if (lastMessage.role !== "user") {
      return new Response(
        JSON.stringify({ error: "Last message must be from user" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Stream the response
    const result = await chat.sendMessageStream(lastMessage.content);

    // Create Server-Sent Events stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream chunks as they arrive
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              const data = `data: ${JSON.stringify({ content: text })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }

          // Send completion signal
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (streamError) {
          console.error("Streaming error:", streamError);

          // Send error to client
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
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });

  } catch (error: any) {
    console.error("Chat API error:", error);

    // Return structured error response
    const errorMessage = error?.message || "Internal server error";
    return new Response(
      JSON.stringify({
        error: errorMessage,
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
      timestamp: new Date().toISOString()
    }),
    {
      headers: { "Content-Type": "application/json" }
    }
  );
}

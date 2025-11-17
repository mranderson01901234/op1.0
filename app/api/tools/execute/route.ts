import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sendToolCall, isAgentConnected } from '@/lib/redis/tool-call';

/**
 * Execute a tool on the user's local agent
 */
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { tool, params, timeout } = await req.json();

    // Validate input
    if (!tool || typeof tool !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: tool name required' },
        { status: 400 }
      );
    }

    if (!params || typeof params !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request: params object required' },
        { status: 400 }
      );
    }

    // Check if agent is connected
    const connected = await isAgentConnected(userId);
    if (!connected) {
      return NextResponse.json(
        { error: 'Agent not connected. Please start the local agent.' },
        { status: 503 }
      );
    }

    // Send tool call and wait for response
    const response = await sendToolCall(userId, {
      tool,
      params,
      timeout,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Tool execution error:', error);

    // Handle timeout
    if (error.message === 'Tool call timed out') {
      return NextResponse.json(
        { error: 'Tool execution timed out', success: false },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to execute tool', details: error.message, success: false },
      { status: 500 }
    );
  }
}

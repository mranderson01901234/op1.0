import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isAgentConnected, getAgentServer } from '@/lib/redis/tool-call';

/**
 * Get agent connection status
 */
export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if agent is connected
    const connected = await isAgentConnected(userId);
    const serverId = connected ? await getAgentServer(userId) : null;

    return NextResponse.json({
      connected,
      serverId,
      userId,
      lastSeen: connected ? new Date().toISOString() : undefined,
    });
  } catch (error: any) {
    console.error('Agent status error:', error);
    return NextResponse.json(
      { error: 'Failed to check agent status', details: error.message },
      { status: 500 }
    );
  }
}

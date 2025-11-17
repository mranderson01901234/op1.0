import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAgentCredentials, getAgentCredentials } from '@/lib/db/agent-credentials';

/**
 * Generate installer for the local agent
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
    const { platform } = await req.json();

    if (!platform || !['win32', 'linux', 'darwin'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be win32, linux, or darwin' },
        { status: 400 }
      );
    }

    // Check if credentials already exist
    let credentials = await getAgentCredentials(userId);

    // Create new credentials if they don't exist
    if (!credentials) {
      credentials = await createAgentCredentials(userId, platform as 'win32' | 'linux' | 'darwin');
    }

    // Get WebSocket server URL from environment
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8082';

    return NextResponse.json({
      success: true,
      credentials: {
        userId: credentials.user_id,
        sharedSecret: credentials.shared_secret,
        serverUrl: wsUrl,
        platform: credentials.platform,
      },
      downloadUrl: `/api/agent/download?platform=${platform}`,
    });
  } catch (error: any) {
    console.error('Agent install error:', error);
    return NextResponse.json(
      { error: 'Failed to generate installer', details: error.message },
      { status: 500 }
    );
  }
}

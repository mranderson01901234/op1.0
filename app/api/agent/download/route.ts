import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAgentCredentials, getAgentCredentials } from '@/lib/db/agent-credentials';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

/**
 * Download unified installer (local agent + Electron browser)
 * Bundles both components with shared credentials
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

    // Get platform from query params
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get('platform') as 'win32' | 'linux' | 'darwin' | null;

    if (!platform || !['win32', 'linux', 'darwin'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be win32, linux, or darwin' },
        { status: 400 }
      );
    }

    // Get or create credentials
    let credentials = await getAgentCredentials(userId);

    if (!credentials) {
      credentials = await createAgentCredentials(userId, platform);
    }

    // Get WebSocket server URL from environment
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8082';

    // Generate agent ID if not in metadata
    const agentId = credentials.metadata?.agent_id || require('crypto').randomBytes(16).toString('hex');
    
    const installerCredentials = {
      userId: credentials.user_id,
      sharedSecret: credentials.shared_secret,
      serverUrl: wsUrl,
      agentId: agentId,
    };

    // Build unified installer using Node.js script
    const installersDir = path.join(process.cwd(), 'installers');
    const buildScriptPath = path.join(process.cwd(), 'scripts', 'build-unified-installer.js');
    
    // Ensure installers directory exists
    if (!fs.existsSync(installersDir)) {
      fs.mkdirSync(installersDir, { recursive: true });
    }

    // Build installer via CLI
    const buildCommand = `node "${buildScriptPath}" ${platform} "${installerCredentials.userId}" "${installerCredentials.sharedSecret}" "${installerCredentials.serverUrl}" "${installerCredentials.agentId}"`;
    
    try {
      execSync(buildCommand, { cwd: process.cwd(), stdio: 'pipe' });
    } catch (error: any) {
      console.error('Installer build error:', error.message);
      throw new Error(`Failed to build installer: ${error.message}`);
    }

    // Determine installer filename
    const installerFilename = platform === 'win32' 
      ? 'OperaStudio-Unified-Setup.exe'
      : platform === 'darwin'
      ? 'OperaStudio-Unified-Installer.dmg'
      : 'operastudio-unified-installer.sh';
    
    const installerPath = path.join(installersDir, installerFilename);

    // Check if installer exists
    if (!fs.existsSync(installerPath)) {
      return NextResponse.json(
        { error: 'Installer not found. Please try again.' },
        { status: 500 }
      );
    }

    // Read installer file
    const installerBuffer = fs.readFileSync(installerPath);
    const filename = path.basename(installerPath);

    // Determine content type
    const contentType = platform === 'win32' 
      ? 'application/x-msdownload'
      : platform === 'darwin'
      ? 'application/x-apple-diskimage'
      : 'application/x-sh';

    // Return installer as download
    return new NextResponse(installerBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': installerBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to generate installer', details: error.message },
      { status: 500 }
    );
  }
}


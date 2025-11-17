import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sendToolCall, isAgentConnected } from '@/lib/redis/tool-call';

/**
 * List directory contents
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
    const { path } = await req.json();

    // Validate input
    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: path string required' },
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

    // Execute list_directory tool
    const response = await sendToolCall(userId, {
      tool: 'list_directory',
      params: { path, recursive: false },
      timeout: 10000, // 10 second timeout for directory listing
    });

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || 'Failed to list directory' },
        { status: 500 }
      );
    }

    // Transform the response to match our FileNode structure
    const files = response.result?.files || [];
    const transformedFiles = files.map((file: any) => ({
      name: file.name,
      type: file.type === 'directory' ? 'folder' : 'file',
      size: file.size,
      modified: file.modified,
    }));

    return NextResponse.json({
      path: response.result?.path || path,
      files: transformedFiles,
    });
  } catch (error: any) {
    console.error('Directory listing error:', error);

    // Handle timeout
    if (error.message === 'Tool call timed out') {
      return NextResponse.json(
        { error: 'Directory listing timed out' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to list directory', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get root directory (workspace root or home directory)
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
    if (!connected) {
      return NextResponse.json(
        { error: 'Agent not connected. Please start the local agent.' },
        { status: 503 }
      );
    }

    // Determine root path - try workspace root first, then home directory
    const workspaceRoot = process.cwd();
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/home';

    // Try workspace root first
    let rootPath = workspaceRoot;
    let triedWorkspace = false;
    
    try {
      const response = await sendToolCall(userId, {
        tool: 'list_directory',
        params: { path: workspaceRoot, recursive: false },
        timeout: 5000,
      });
      
      triedWorkspace = true;
      if (response.success) {
        return NextResponse.json({ rootPath: workspaceRoot });
      }
    } catch (error) {
      // Workspace root failed, try home directory
      triedWorkspace = true;
    }

    // Fallback to home directory
    if (triedWorkspace) {
      try {
        const response = await sendToolCall(userId, {
          tool: 'list_directory',
          params: { path: homeDir, recursive: false },
          timeout: 5000,
        });
        
        if (response.success) {
          return NextResponse.json({ rootPath: homeDir });
        }
      } catch (error) {
        // Both failed
      }
    }

    // If both failed, return workspace root anyway (will show error when trying to load)
    return NextResponse.json({ rootPath: workspaceRoot });
  } catch (error: any) {
    console.error('Root directory error:', error);
    return NextResponse.json(
      { error: 'Failed to get root directory', details: error.message },
      { status: 500 }
    );
  }
}


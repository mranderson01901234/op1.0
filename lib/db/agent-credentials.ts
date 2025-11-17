import { query } from './client';
import crypto from 'crypto';

export interface AgentCredential {
  user_id: string;
  shared_secret: string;
  platform: 'win32' | 'linux' | 'darwin';
  status: 'pending' | 'connected' | 'disconnected';
  created_at: Date;
  last_seen: Date | null;
  metadata: any;
}

/**
 * Generate a new shared secret for agent authentication
 */
export function generateSharedSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create new agent credentials for a user
 */
export async function createAgentCredentials(
  userId: string,
  platform: 'win32' | 'linux' | 'darwin'
): Promise<AgentCredential> {
  const sharedSecret = generateSharedSecret();

  const result = await query(
    `INSERT INTO agent_credentials (user_id, shared_secret, platform, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [userId, sharedSecret, platform]
  );

  return result.rows[0];
}

/**
 * Get agent credentials by user ID
 */
export async function getAgentCredentials(userId: string): Promise<AgentCredential | null> {
  const result = await query(
    `SELECT * FROM agent_credentials WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * Validate agent credentials (shared secret)
 */
export async function validateAgentCredentials(
  userId: string,
  sharedSecret: string
): Promise<boolean> {
  const result = await query(
    `SELECT user_id FROM agent_credentials
     WHERE user_id = $1 AND shared_secret = $2`,
    [userId, sharedSecret]
  );

  return result.rows.length > 0;
}

/**
 * Update agent status
 */
export async function updateAgentStatus(
  userId: string,
  status: 'connected' | 'disconnected'
): Promise<void> {
  await query(
    `UPDATE agent_credentials
     SET status = $1, last_seen = NOW()
     WHERE user_id = $2`,
    [status, userId]
  );
}

/**
 * Update last_seen timestamp (called on heartbeat)
 */
export async function updateLastSeen(userId: string): Promise<void> {
  await query(
    `UPDATE agent_credentials
     SET last_seen = NOW()
     WHERE user_id = $1`,
    [userId]
  );
}

/**
 * Delete agent credentials (revoke access)
 */
export async function deleteAgentCredentials(userId: string): Promise<void> {
  await query(
    `DELETE FROM agent_credentials WHERE user_id = $1`,
    [userId]
  );
}

/**
 * Get all connected agents
 */
export async function getConnectedAgents(): Promise<AgentCredential[]> {
  const result = await query(
    `SELECT * FROM agent_credentials
     WHERE status = 'connected'
     ORDER BY last_seen DESC`
  );

  return result.rows;
}

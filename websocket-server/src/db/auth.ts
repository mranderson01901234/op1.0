import { query } from './client';

/**
 * Validate agent credentials
 */
export async function validateCredentials(
  userId: string,
  sharedSecret: string
): Promise<boolean> {
  try {
    const result = await query(
      `SELECT user_id FROM agent_credentials
       WHERE user_id = $1 AND shared_secret = $2`,
      [userId, sharedSecret]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('Failed to validate credentials:', error);
    return false;
  }
}

/**
 * Update agent status in database
 */
export async function updateAgentStatus(
  userId: string,
  status: 'connected' | 'disconnected',
  lastSeen?: Date
): Promise<void> {
  try {
    await query(
      `UPDATE agent_credentials
       SET status = $1, last_seen = $2
       WHERE user_id = $3`,
      [status, lastSeen || new Date(), userId]
    );
  } catch (error) {
    console.error('Failed to update agent status:', error);
  }
}

/**
 * Log tool execution to database
 */
export async function logToolExecution(
  userId: string,
  requestId: string,
  toolName: string,
  params: any,
  result: any,
  success: boolean,
  error?: string,
  executionTimeMs?: number
): Promise<void> {
  try {
    await query(
      `INSERT INTO tool_execution_logs
       (user_id, request_id, tool_name, params, result, success, error, execution_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        requestId,
        toolName,
        JSON.stringify(params),
        success ? JSON.stringify(result) : null,
        success,
        error || null,
        executionTimeMs || null,
      ]
    );
  } catch (error) {
    console.error('Failed to log tool execution:', error);
  }
}

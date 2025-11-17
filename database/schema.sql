-- OperaStudio Local Environment Assistant - Database Schema
-- PostgreSQL

-- Table: agent_credentials
-- Stores credentials for each user's local agent
CREATE TABLE IF NOT EXISTS agent_credentials (
  user_id TEXT PRIMARY KEY,
  shared_secret TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('win32', 'linux', 'darwin')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'connected', 'disconnected')),
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP,
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_shared_secret ON agent_credentials(shared_secret);
CREATE INDEX IF NOT EXISTS idx_agent_status ON agent_credentials(status);
CREATE INDEX IF NOT EXISTS idx_agent_last_seen ON agent_credentials(last_seen DESC);

-- Table: tool_execution_logs
-- Audit log of all tool executions
CREATE TABLE IF NOT EXISTS tool_execution_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  params JSONB,
  result JSONB,
  success BOOLEAN,
  error TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_tool_logs_user_created ON tool_execution_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_logs_request_id ON tool_execution_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_tool_logs_tool_name ON tool_execution_logs(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_logs_success ON tool_execution_logs(success);

-- Table: user_sessions (optional - for analytics)
CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_start TIMESTAMP DEFAULT NOW(),
  session_end TIMESTAMP,
  tool_calls_count INTEGER DEFAULT 0,
  agent_version TEXT,
  agent_platform TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_start ON user_sessions(user_id, session_start DESC);

-- Comments for documentation
COMMENT ON TABLE agent_credentials IS 'Stores authentication credentials for local agents';
COMMENT ON TABLE tool_execution_logs IS 'Audit log of all tool executions for security and debugging';
COMMENT ON TABLE user_sessions IS 'Tracks user session metrics for analytics';

COMMENT ON COLUMN agent_credentials.shared_secret IS 'SHA-256 hash of the shared secret (32 bytes random)';
COMMENT ON COLUMN agent_credentials.platform IS 'Operating system: win32, linux, or darwin';
COMMENT ON COLUMN agent_credentials.status IS 'Connection status: pending, connected, or disconnected';
COMMENT ON COLUMN agent_credentials.metadata IS 'Additional metadata: version, permissions, etc.';

COMMENT ON COLUMN tool_execution_logs.params IS 'JSON object of tool parameters';
COMMENT ON COLUMN tool_execution_logs.result IS 'JSON object of tool execution result';
COMMENT ON COLUMN tool_execution_logs.execution_time_ms IS 'Time taken to execute tool in milliseconds';

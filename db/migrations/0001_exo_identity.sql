-- Exo individual identity layer (Cloudflare D1 / SQLite)
-- Apply in the exo-fr D1 database before setting EXO_AUTH_MODE=pilot.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS exo_users (
 id TEXT PRIMARY KEY,
 username TEXT NOT NULL UNIQUE COLLATE NOCASE,
 role TEXT NOT NULL CHECK(role IN ('student','teacher')),
 avatar TEXT NOT NULL DEFAULT 'girl' CHECK(avatar IN ('girl','boy')),
 password_salt TEXT NOT NULL,
 password_hash TEXT NOT NULL,
 iterations INTEGER NOT NULL DEFAULT 260000 CHECK(iterations>=100000),
 must_change INTEGER NOT NULL DEFAULT 1 CHECK(must_change IN (0,1)),
 disabled INTEGER NOT NULL DEFAULT 0 CHECK(disabled IN (0,1)),
 failed_attempts INTEGER NOT NULL DEFAULT 0,
 locked_until INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
-- First rollout has a single bootstrap teacher; later co-teacher accounts require an audited admin workflow.
CREATE UNIQUE INDEX IF NOT EXISTS idx_exo_one_teacher ON exo_users(role) WHERE role='teacher';
CREATE INDEX IF NOT EXISTS idx_exo_users_created_at ON exo_users(created_at DESC);
CREATE TABLE IF NOT EXISTS exo_sessions (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES exo_users(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_exo_sessions_user_id ON exo_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_exo_sessions_expire ON exo_sessions(expires_at);

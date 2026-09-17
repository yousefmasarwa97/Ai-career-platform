import { DatabaseSync } from 'node:sqlite';
import { config } from './config';

// Uses Node's built-in SQLite (node:sqlite, available in Node 22.5+ / 24).
// No native compilation or extra dependency required.
export const db = new DatabaseSync(config.paths.dbFile);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Simple synchronous transaction helper (node:sqlite has no .transaction()).
export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK (role IN ('candidate','mentor','admin')),
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS candidate_profiles (
      user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      full_name       TEXT,
      personal        TEXT,   -- JSON
      education        TEXT,  -- JSON array
      experience       TEXT,  -- JSON array
      skills           TEXT,  -- JSON array
      projects         TEXT,  -- JSON array
      certifications   TEXT,  -- JSON array
      career_goals     TEXT,
      preferred_roles  TEXT,  -- JSON array
      photo            TEXT,  -- optional profile photo URL/path
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mentor_profiles (
      user_id      INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      full_name    TEXT,
      contact_info TEXT,      -- nullable / optional (JSON)
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cv_versions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename      TEXT NOT NULL,
      storage_key   TEXT NOT NULL,
      format        TEXT NOT NULL,
      version_label TEXT,
      content_text  TEXT,     -- extracted/plain text used by AI agents
      uploaded_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      created_by     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title          TEXT NOT NULL,
      description    TEXT,
      required_skills TEXT,   -- JSON array
      location       TEXT,
      url            TEXT,    -- optional external link to the job posting
      company_name   TEXT,    -- optional company name
      company_logo   TEXT,    -- optional company logo/photo URL
      status         TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published')),
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS applications (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id       INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      status       TEXT NOT NULL DEFAULT 'submitted',
      applied_at   TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (candidate_id, job_id)
    );

    CREATE TABLE IF NOT EXISTS ai_outputs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type          TEXT NOT NULL,
      payload       TEXT NOT NULL,   -- JSON (OrchestratorResult)
      source_agents TEXT NOT NULL,   -- JSON array of agent names
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_reviews (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cv_version_id     INTEGER NOT NULL REFERENCES cv_versions(id) ON DELETE CASCADE,
      requested_by_admin INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      findings          TEXT NOT NULL,  -- JSON
      explanation       TEXT NOT NULL,
      source_agents     TEXT NOT NULL,  -- JSON array
      is_ai_generated   INTEGER NOT NULL DEFAULT 1,
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ai_output_id INTEGER REFERENCES ai_outputs(id) ON DELETE SET NULL,
      rating       INTEGER,
      comment      TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS access_logs (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action         TEXT NOT NULL,
      target_type    TEXT,
      target_id      INTEGER,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  runMigrations();
}

// Lightweight, idempotent migrations for existing databases.
function runMigrations(): void {
  const jobCols = db.prepare('PRAGMA table_info(jobs)').all() as Array<{ name: string }>;
  const hasCol = (name: string) => jobCols.some((c) => c.name === name);
  if (!hasCol('url')) db.exec('ALTER TABLE jobs ADD COLUMN url TEXT;');
  if (!hasCol('company_name')) db.exec('ALTER TABLE jobs ADD COLUMN company_name TEXT;');
  if (!hasCol('company_logo')) db.exec('ALTER TABLE jobs ADD COLUMN company_logo TEXT;');

  const profCols = db.prepare('PRAGMA table_info(candidate_profiles)').all() as Array<{ name: string }>;
  if (!profCols.some((c) => c.name === 'photo')) {
    db.exec('ALTER TABLE candidate_profiles ADD COLUMN photo TEXT;');
  }
}

// Records access to sensitive candidate data (Requirement 15.2).
export function logAccess(
  actorUserId: number | null,
  action: string,
  targetType?: string,
  targetId?: number
): void {
  db.prepare(
    `INSERT INTO access_logs (actor_user_id, action, target_type, target_id)
     VALUES (?, ?, ?, ?)`
  ).run(actorUserId, action, targetType ?? null, targetId ?? null);
}

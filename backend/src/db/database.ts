import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = env.DATABASE_PATH;
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  initSchema(dbInstance);
  return dbInstance;
}

export function initTestDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      repo_url TEXT NOT NULL,
      package_name TEXT NOT NULL,
      from_version TEXT NOT NULL,
      to_version TEXT NOT NULL,
      status TEXT NOT NULL,
      current_round INTEGER NOT NULL DEFAULT 1,
      max_rounds INTEGER NOT NULL DEFAULT 3,
      branch_name TEXT,
      winning_candidate_id TEXT,
      pr_url TEXT,
      pr_title TEXT,
      pr_body TEXT,
      risk_level TEXT,
      cost_estimate_usd REAL DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      round INTEGER NOT NULL DEFAULT 1,
      strategy TEXT NOT NULL,
      strategy_description TEXT NOT NULL,
      diff TEXT NOT NULL,
      status TEXT NOT NULL,
      test_passed INTEGER NOT NULL DEFAULT 0,
      test_count INTEGER NOT NULL DEFAULT 0,
      pass_count INTEGER NOT NULL DEFAULT 0,
      fail_count INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      logs TEXT NOT NULL DEFAULT '',
      model_tier TEXT NOT NULL,
      model_id TEXT NOT NULL,
      tokens_used INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      snippet TEXT NOT NULL,
      score REAL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      stage TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS benchmarks (
      id TEXT PRIMARY KEY,
      fixture_name TEXT NOT NULL,
      package_name TEXT NOT NULL,
      from_version TEXT NOT NULL,
      to_version TEXT NOT NULL,
      mode TEXT NOT NULL,
      success INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      tokens_used INTEGER NOT NULL,
      cost_estimate_usd REAL NOT NULL,
      rounds_needed INTEGER NOT NULL,
      winning_strategy TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_candidates_job_id ON candidates(job_id);
    CREATE INDEX IF NOT EXISTS idx_sources_job_id ON sources(job_id);
    CREATE INDEX IF NOT EXISTS idx_logs_job_id ON logs(job_id);
    CREATE INDEX IF NOT EXISTS idx_benchmarks_fixture ON benchmarks(fixture_name);
  `);
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

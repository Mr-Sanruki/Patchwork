import Database from 'better-sqlite3';
import {
  Job,
  Candidate,
  TavilySource,
  PipelineLog,
  BenchmarkRecord,
} from '../types/index.js';
import { getDatabase } from './database.js';

export class Repository {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db || getDatabase();
  }

  // --- Jobs ---

  createJob(job: Job): Job {
    const stmt = this.db.prepare(`
      INSERT INTO jobs (
        id, repo_url, package_name, from_version, to_version,
        status, current_round, max_rounds, branch_name, winning_candidate_id,
        pr_url, pr_title, pr_body, risk_level, cost_estimate_usd,
        total_tokens, error, created_at, updated_at
      ) VALUES (
        @id, @repoUrl, @packageName, @fromVersion, @toVersion,
        @status, @currentRound, @maxRounds, @branchName, @winningCandidateId,
        @prUrl, @prTitle, @prBody, @riskLevel, @costEstimateUsd,
        @totalTokens, @error, @createdAt, @updatedAt
      )
    `);

    stmt.run({
      id: job.id,
      repoUrl: job.repoUrl,
      packageName: job.packageName,
      fromVersion: job.fromVersion,
      toVersion: job.toVersion,
      status: job.status,
      currentRound: job.currentRound,
      maxRounds: job.maxRounds,
      branchName: job.branchName || null,
      winningCandidateId: job.winningCandidateId || null,
      prUrl: job.prUrl || null,
      prTitle: job.prTitle || null,
      prBody: job.prBody || null,
      riskLevel: job.riskLevel || null,
      costEstimateUsd: job.costEstimateUsd || 0,
      totalTokens: job.totalTokens || 0,
      error: job.error || null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });

    return job;
  }

  getJob(id: string): Job | null {
    const row = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapJobRow(row);
  }

  listJobs(limit = 20): Job[] {
    const rows = this.db.prepare('SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?').all(limit) as Record<string, unknown>[];
    return rows.map((r) => this.mapJobRow(r));
  }

  updateJob(id: string, updates: Partial<Job>): Job | null {
    const current = this.getJob(id);
    if (!current) return null;

    const merged: Job = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const stmt = this.db.prepare(`
      UPDATE jobs SET
        status = @status,
        current_round = @currentRound,
        branch_name = @branchName,
        winning_candidate_id = @winningCandidateId,
        pr_url = @prUrl,
        pr_title = @prTitle,
        pr_body = @prBody,
        risk_level = @riskLevel,
        cost_estimate_usd = @costEstimateUsd,
        total_tokens = @totalTokens,
        error = @error,
        updated_at = @updatedAt
      WHERE id = @id
    `);

    stmt.run({
      id: merged.id,
      status: merged.status,
      currentRound: merged.currentRound,
      branchName: merged.branchName || null,
      winningCandidateId: merged.winningCandidateId || null,
      prUrl: merged.prUrl || null,
      prTitle: merged.prTitle || null,
      prBody: merged.prBody || null,
      riskLevel: merged.riskLevel || null,
      costEstimateUsd: merged.costEstimateUsd || 0,
      totalTokens: merged.totalTokens || 0,
      error: merged.error || null,
      updatedAt: merged.updatedAt,
    });

    return merged;
  }

  // --- Candidates ---

  createCandidate(candidate: Candidate): Candidate {
    const stmt = this.db.prepare(`
      INSERT INTO candidates (
        id, job_id, round, strategy, strategy_description, diff,
        status, test_passed, test_count, pass_count, fail_count,
        duration_ms, logs, model_tier, model_id, tokens_used,
        error_message, created_at
      ) VALUES (
        @id, @jobId, @round, @strategy, @strategyDescription, @diff,
        @status, @testPassed, @testCount, @passCount, @failCount,
        @durationMs, @logs, @modelTier, @modelId, @tokensUsed,
        @errorMessage, @createdAt
      )
    `);

    stmt.run({
      id: candidate.id,
      jobId: candidate.jobId,
      round: candidate.round,
      strategy: candidate.strategy,
      strategyDescription: candidate.strategyDescription,
      diff: candidate.diff,
      status: candidate.status,
      testPassed: candidate.testPassed ? 1 : 0,
      testCount: candidate.testCount,
      passCount: candidate.passCount,
      failCount: candidate.failCount,
      durationMs: candidate.durationMs,
      logs: candidate.logs,
      modelTier: candidate.modelTier,
      modelId: candidate.modelId,
      tokensUsed: candidate.tokensUsed || 0,
      errorMessage: candidate.errorMessage || null,
      createdAt: candidate.createdAt,
    });

    return candidate;
  }

  updateCandidate(id: string, updates: Partial<Candidate>): Candidate | null {
    const row = this.db.prepare('SELECT * FROM candidates WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;

    const current = this.mapCandidateRow(row);
    const merged: Candidate = { ...current, ...updates };

    const stmt = this.db.prepare(`
      UPDATE candidates SET
        status = @status,
        test_passed = @testPassed,
        test_count = @testCount,
        pass_count = @passCount,
        fail_count = @failCount,
        duration_ms = @durationMs,
        logs = @logs,
        tokens_used = @tokensUsed,
        error_message = @errorMessage
      WHERE id = @id
    `);

    stmt.run({
      id: merged.id,
      status: merged.status,
      testPassed: merged.testPassed ? 1 : 0,
      testCount: merged.testCount,
      passCount: merged.passCount,
      failCount: merged.failCount,
      durationMs: merged.durationMs,
      logs: merged.logs,
      tokensUsed: merged.tokensUsed || 0,
      errorMessage: merged.errorMessage || null,
    });

    return merged;
  }

  getCandidatesByJobId(jobId: string): Candidate[] {
    const rows = this.db.prepare('SELECT * FROM candidates WHERE job_id = ? ORDER BY round ASC, created_at ASC').all(jobId) as Record<string, unknown>[];
    return rows.map((r) => this.mapCandidateRow(r));
  }

  getCandidate(id: string): Candidate | null {
    const row = this.db.prepare('SELECT * FROM candidates WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapCandidateRow(row);
  }

  // --- Sources ---

  createSource(source: TavilySource): TavilySource {
    const stmt = this.db.prepare(`
      INSERT INTO sources (id, job_id, title, url, snippet, score, created_at)
      VALUES (@id, @jobId, @title, @url, @snippet, @score, @createdAt)
    `);

    stmt.run({
      id: source.id,
      jobId: source.jobId,
      title: source.title,
      url: source.url,
      snippet: source.snippet,
      score: source.score || null,
      createdAt: source.createdAt,
    });

    return source;
  }

  getSourcesByJobId(jobId: string): TavilySource[] {
    const rows = this.db.prepare('SELECT * FROM sources WHERE job_id = ? ORDER BY score DESC, created_at ASC').all(jobId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      jobId: String(r.job_id),
      title: String(r.title),
      url: String(r.url),
      snippet: String(r.snippet),
      score: r.score !== null ? Number(r.score) : undefined,
      createdAt: String(r.created_at),
    }));
  }

  // --- Logs ---

  addLog(log: PipelineLog): PipelineLog {
    const stmt = this.db.prepare(`
      INSERT INTO logs (id, job_id, stage, level, message, metadata, timestamp)
      VALUES (@id, @jobId, @stage, @level, @message, @metadata, @timestamp)
    `);

    stmt.run({
      id: log.id,
      jobId: log.jobId,
      stage: log.stage,
      level: log.level,
      message: log.message,
      metadata: log.metadata ? JSON.stringify(log.metadata) : null,
      timestamp: log.timestamp,
    });

    return log;
  }

  getLogsByJobId(jobId: string): PipelineLog[] {
    const rows = this.db.prepare('SELECT * FROM logs WHERE job_id = ? ORDER BY timestamp ASC').all(jobId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      jobId: String(r.job_id),
      stage: String(r.stage),
      level: r.level as 'info' | 'warn' | 'error' | 'debug',
      message: String(r.message),
      metadata: r.metadata ? JSON.parse(String(r.metadata)) : undefined,
      timestamp: String(r.timestamp),
    }));
  }

  // --- Benchmarks ---

  createBenchmark(bench: BenchmarkRecord): BenchmarkRecord {
    const stmt = this.db.prepare(`
      INSERT INTO benchmarks (
        id, fixture_name, package_name, from_version, to_version,
        mode, success, duration_ms, tokens_used, cost_estimate_usd,
        rounds_needed, winning_strategy, notes, created_at
      ) VALUES (
        @id, @fixtureName, @packageName, @fromVersion, @toVersion,
        @mode, @success, @durationMs, @tokensUsed, @costEstimateUsd,
        @roundsNeeded, @winningStrategy, @notes, @createdAt
      )
    `);

    stmt.run({
      id: bench.id,
      fixtureName: bench.fixtureName,
      packageName: bench.packageName,
      fromVersion: bench.fromVersion,
      toVersion: bench.toVersion,
      mode: bench.mode,
      success: bench.success ? 1 : 0,
      durationMs: bench.durationMs,
      tokensUsed: bench.tokensUsed,
      costEstimateUsd: bench.costEstimateUsd,
      roundsNeeded: bench.roundsNeeded,
      winningStrategy: bench.winningStrategy || null,
      notes: bench.notes || null,
      createdAt: bench.createdAt,
    });

    return bench;
  }

  listBenchmarks(): BenchmarkRecord[] {
    const rows = this.db.prepare('SELECT * FROM benchmarks ORDER BY created_at DESC').all() as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      fixtureName: String(r.fixture_name),
      packageName: String(r.package_name),
      fromVersion: String(r.from_version),
      toVersion: String(r.to_version),
      mode: r.mode as 'patchwork' | 'baseline' | 'no_tavily',
      success: Boolean(r.success),
      durationMs: Number(r.duration_ms),
      tokensUsed: Number(r.tokens_used),
      costEstimateUsd: Number(r.cost_estimate_usd),
      roundsNeeded: Number(r.rounds_needed),
      winningStrategy: r.winning_strategy ? String(r.winning_strategy) : undefined,
      notes: r.notes ? String(r.notes) : undefined,
      createdAt: String(r.created_at),
    }));
  }

  // --- Row Mappers ---

  private mapJobRow(r: Record<string, unknown>): Job {
    return {
      id: String(r.id),
      repoUrl: String(r.repo_url),
      packageName: String(r.package_name),
      fromVersion: String(r.from_version),
      toVersion: String(r.to_version),
      status: r.status as Job['status'],
      currentRound: Number(r.current_round),
      maxRounds: Number(r.max_rounds),
      branchName: r.branch_name ? String(r.branch_name) : undefined,
      winningCandidateId: r.winning_candidate_id ? String(r.winning_candidate_id) : undefined,
      prUrl: r.pr_url ? String(r.pr_url) : undefined,
      prTitle: r.pr_title ? String(r.pr_title) : undefined,
      prBody: r.pr_body ? String(r.pr_body) : undefined,
      riskLevel: r.risk_level as Job['riskLevel'],
      costEstimateUsd: Number(r.cost_estimate_usd || 0),
      totalTokens: Number(r.total_tokens || 0),
      error: r.error ? String(r.error) : undefined,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    };
  }

  private mapCandidateRow(r: Record<string, unknown>): Candidate {
    return {
      id: String(r.id),
      jobId: String(r.job_id),
      round: Number(r.round),
      strategy: r.strategy as Candidate['strategy'],
      strategyDescription: String(r.strategy_description),
      diff: String(r.diff),
      status: r.status as Candidate['status'],
      testPassed: Boolean(r.test_passed),
      testCount: Number(r.test_count),
      passCount: Number(r.pass_count),
      failCount: Number(r.fail_count),
      durationMs: Number(r.duration_ms),
      logs: String(r.logs || ''),
      modelTier: r.model_tier as Candidate['modelTier'],
      modelId: String(r.model_id),
      tokensUsed: Number(r.tokens_used || 0),
      errorMessage: r.error_message ? String(r.error_message) : undefined,
      createdAt: String(r.created_at),
    };
  }
}

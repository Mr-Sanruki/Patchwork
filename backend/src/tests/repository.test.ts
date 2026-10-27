import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initTestDatabase } from '../db/database.js';
import { Repository } from '../db/repository.js';
import Database from 'better-sqlite3';
import { Job, Candidate } from '../types/index.js';

describe('Repository Layer', () => {
  let db: Database.Database;
  let repo: Repository;

  beforeEach(() => {
    db = initTestDatabase();
    repo = new Repository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates and retrieves a job', () => {
    const job: Job = {
      id: 'job-123',
      repoUrl: 'https://github.com/example/repo',
      packageName: 'chalk',
      fromVersion: '4.1.2',
      toVersion: '5.3.0',
      status: 'pending',
      currentRound: 1,
      maxRounds: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    repo.createJob(job);
    const retrieved = repo.getJob('job-123');

    expect(retrieved).not.toBeNull();
    expect(retrieved?.packageName).toBe('chalk');
    expect(retrieved?.status).toBe('pending');
  });

  it('updates a job status and winning candidate', () => {
    const job: Job = {
      id: 'job-456',
      repoUrl: 'https://github.com/example/repo2',
      packageName: 'node-fetch',
      fromVersion: '2.6.7',
      toVersion: '3.3.2',
      status: 'pending',
      currentRound: 1,
      maxRounds: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    repo.createJob(job);
    const updated = repo.updateJob('job-456', {
      status: 'completed',
      winningCandidateId: 'cand-1',
      riskLevel: 'LOW',
    });

    expect(updated?.status).toBe('completed');
    expect(updated?.winningCandidateId).toBe('cand-1');
    expect(updated?.riskLevel).toBe('LOW');

    const fresh = repo.getJob('job-456');
    expect(fresh?.status).toBe('completed');
  });

  it('creates candidates and retrieves them by job id', () => {
    const job: Job = {
      id: 'job-789',
      repoUrl: 'https://github.com/example/repo3',
      packageName: 'express',
      fromVersion: '4.18.2',
      toVersion: '5.0.0',
      status: 'testing_candidates',
      currentRound: 1,
      maxRounds: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    repo.createJob(job);

    const cand1: Candidate = {
      id: 'c-1',
      jobId: 'job-789',
      round: 1,
      strategy: 'minimal',
      strategyDescription: 'Minimal bump',
      diff: 'diff --git a/package.json b/package.json...',
      status: 'passed',
      testPassed: true,
      testCount: 4,
      passCount: 4,
      failCount: 0,
      durationMs: 1200,
      logs: 'PASS tests',
      modelTier: 'super',
      modelId: 'nvidia/Llama-3.1-Nemotron-70B-Instruct-HF',
      createdAt: new Date().toISOString(),
    };

    repo.createCandidate(cand1);
    const candidates = repo.getCandidatesByJobId('job-789');

    expect(candidates).toHaveLength(1);
    expect(candidates[0].strategy).toBe('minimal');
    expect(candidates[0].testPassed).toBe(true);
  });

  it('stores and retrieves Tavily sources and logs', () => {
    const job: Job = {
      id: 'job-src',
      repoUrl: 'https://github.com/example/repo4',
      packageName: 'commander',
      fromVersion: '8.0.0',
      toVersion: '12.0.0',
      status: 'researching',
      currentRound: 1,
      maxRounds: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    repo.createJob(job);

    repo.createSource({
      id: 'src-1',
      jobId: 'job-src',
      title: 'Commander v12 Migration Guide',
      url: 'https://github.com/tj/commander.js/blob/master/CHANGELOG.md',
      snippet: 'Breaking changes in v12...',
      score: 0.95,
      createdAt: new Date().toISOString(),
    });

    const sources = repo.getSourcesByJobId('job-src');
    expect(sources).toHaveLength(1);
    expect(sources[0].title).toContain('Migration Guide');

    repo.addLog({
      id: 'log-1',
      jobId: 'job-src',
      stage: 'research',
      level: 'info',
      message: 'Found official migration notes',
      timestamp: new Date().toISOString(),
    });

    const logs = repo.getLogsByJobId('job-src');
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('Found official migration notes');
  });
});

export type JobStatus =
  | 'pending'
  | 'cloning'
  | 'baselining'
  | 'breaking'
  | 'researching'
  | 'triaging'
  | 'generating_candidates'
  | 'testing_candidates'
  | 'repairing'
  | 'selecting'
  | 'reviewing'
  | 'completed'
  | 'failed';

export type CandidateStatus =
  | 'pending'
  | 'generating'
  | 'validating_diff'
  | 'testing'
  | 'passed'
  | 'failed'
  | 'invalid_diff';

export type CandidateStrategy =
  | 'minimal'
  | 'adapter'
  | 'codemod'
  | 'refactor';

export interface Job {
  id: string;
  repoUrl: string;
  packageName: string;
  fromVersion: string;
  toVersion: string;
  status: JobStatus;
  currentRound: number;
  maxRounds: number;
  branchName?: string;
  winningCandidateId?: string;
  prUrl?: string;
  prTitle?: string;
  prBody?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  costEstimateUsd?: number;
  totalTokens?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Candidate {
  id: string;
  jobId: string;
  round: number;
  strategy: CandidateStrategy;
  strategyDescription: string;
  diff: string;
  status: CandidateStatus;
  testPassed: boolean;
  testCount: number;
  passCount: number;
  failCount: number;
  durationMs: number;
  logs: string;
  modelTier: 'nano' | 'super' | 'ultra';
  modelId: string;
  tokensUsed?: number;
  errorMessage?: string;
  createdAt: string;
}

export interface TavilySource {
  id: string;
  jobId: string;
  title: string;
  url: string;
  snippet: string;
  score?: number;
  createdAt: string;
}

export interface PipelineLog {
  id: string;
  jobId: string;
  stage: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface BenchmarkRecord {
  id: string;
  fixtureName: string;
  packageName: string;
  fromVersion: string;
  toVersion: string;
  mode: 'patchwork' | 'baseline' | 'no_tavily';
  success: boolean;
  durationMs: number;
  tokensUsed: number;
  costEstimateUsd: number;
  roundsNeeded: number;
  winningStrategy?: string;
  notes?: string;
  createdAt: string;
}

export interface SseEvent {
  type:
    | 'job:status'
    | 'job:log'
    | 'candidate:created'
    | 'candidate:update'
    | 'tavily:source'
    | 'job:completed'
    | 'job:failed';
  jobId: string;
  data: unknown;
  timestamp: string;
}

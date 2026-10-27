export interface SandboxExecutionRequest {
  workspaceDir: string;
  diff?: string;
  command: string;
  timeoutMs?: number;
  env?: Record<string, string>;
}

export interface SandboxExecutionResult {
  passed: boolean;
  exitCode: number;
  durationMs: number;
  logs: string;
  testCount: number;
  passCount: number;
  failCount: number;
  error?: string;
  runnerUsed: string;
}

export interface SandboxRunner {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  run(request: SandboxExecutionRequest): Promise<SandboxExecutionResult>;
}

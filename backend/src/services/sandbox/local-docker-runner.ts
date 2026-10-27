import { spawn } from 'child_process';
import { SandboxExecutionRequest, SandboxExecutionResult, SandboxRunner } from './types.js';
import { applyDiffToWorkspace, parseTestCounts, sanitizeLogs } from './utils.js';
import { env } from '../../config/env.js';

export class LocalDockerRunner implements SandboxRunner {
  readonly name = 'LocalDockerRunner';
  private dockerAvailable: boolean | null = null;

  async isAvailable(): Promise<boolean> {
    if (this.dockerAvailable !== null) {
      return this.dockerAvailable;
    }

    try {
      const exitCode = await new Promise<number>((resolve) => {
        const proc = spawn('docker', ['info'], { stdio: 'ignore' });
        proc.on('close', (code) => resolve(code ?? 1));
        proc.on('error', () => resolve(1));
      });
      this.dockerAvailable = exitCode === 0;
      return this.dockerAvailable;
    } catch {
      this.dockerAvailable = false;
      return false;
    }
  }

  async run(request: SandboxExecutionRequest): Promise<SandboxExecutionResult> {
    const startTime = Date.now();
    const timeoutMs = request.timeoutMs ?? env.DOCKER_TIMEOUT_MS;

    // 1. Apply diff if provided
    if (request.diff) {
      const patchResult = applyDiffToWorkspace(request.workspaceDir, request.diff);
      if (!patchResult.success) {
        return {
          passed: false,
          exitCode: 1,
          durationMs: Date.now() - startTime,
          logs: `[Patchwork Diff Engine] Failed to apply candidate diff cleanly:\n${patchResult.error}`,
          testCount: 0,
          passCount: 0,
          failCount: 0,
          error: patchResult.error,
          runnerUsed: `${this.name} (diff-failed)`,
        };
      }
    }

    const hasDocker = await this.isAvailable();

    if (hasDocker) {
      return this.runWithDocker(request, startTime, timeoutMs);
    } else {
      // Local isolated fallback runner when docker daemon is not active
      return this.runWithIsolatedProcess(request, startTime, timeoutMs);
    }
  }

  private async runWithDocker(
    request: SandboxExecutionRequest,
    startTime: number,
    timeoutMs: number
  ): Promise<SandboxExecutionResult> {
    const normDir = request.workspaceDir.replace(/\\/g, '/');
    const image = env.DOCKER_IMAGE;

    const dockerArgs = [
      'run',
      '--rm',
      '-v',
      `${normDir}:/workspace`,
      '-w',
      '/workspace',
      '--memory=2g',
      '--cpus=2',
      image,
      'sh',
      '-c',
      request.command,
    ];

    return this.executeProcess('docker', dockerArgs, request.workspaceDir, startTime, timeoutMs, `${this.name} (Docker: ${image})`);
  }

  private async runWithIsolatedProcess(
    request: SandboxExecutionRequest,
    startTime: number,
    timeoutMs: number
  ): Promise<SandboxExecutionResult> {
    // Strip secrets from env
    const safeEnv: NodeJS.ProcessEnv = {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      USERPROFILE: process.env.USERPROFILE,
      NODE_ENV: 'test',
      CI: 'true',
      ...(request.env || {}),
    };

    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : 'sh';
    const shellArgs = isWindows ? ['/d', '/s', '/c', request.command] : ['-c', request.command];

    return this.executeProcess(
      shell,
      shellArgs,
      request.workspaceDir,
      startTime,
      timeoutMs,
      `${this.name} (Local Process Sandbox - Docker Daemon Offline)`,
      safeEnv
    );
  }

  private async executeProcess(
    command: string,
    args: string[],
    cwd: string,
    startTime: number,
    timeoutMs: number,
    runnerName: string,
    customEnv?: NodeJS.ProcessEnv
  ): Promise<SandboxExecutionResult> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const proc = spawn(command, args, {
        cwd,
        env: customEnv || process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          proc.kill('SIGKILL');
        } catch {}
      }, timeoutMs);

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        const durationMs = Date.now() - startTime;
        const rawLogs = `${stdout}\n${stderr}`;
        const logs = sanitizeLogs(rawLogs);
        const { testCount, passCount, failCount } = parseTestCounts(logs);

        if (timedOut) {
          resolve({
            passed: false,
            exitCode: 124,
            durationMs,
            logs: `${logs}\n[Patchwork Sandbox] Execution timed out after ${timeoutMs}ms`,
            testCount,
            passCount,
            failCount: Math.max(1, failCount),
            error: `Timeout exceeded (${timeoutMs}ms)`,
            runnerUsed: runnerName,
          });
          return;
        }

        const passed = code === 0 && failCount === 0;

        resolve({
          passed,
          exitCode: code ?? 1,
          durationMs,
          logs,
          testCount,
          passCount,
          failCount,
          error: passed ? undefined : `Command exited with code ${code}`,
          runnerUsed: runnerName,
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          passed: false,
          exitCode: 1,
          durationMs: Date.now() - startTime,
          logs: `Execution error: ${err.message}`,
          testCount: 0,
          passCount: 0,
          failCount: 1,
          error: err.message,
          runnerUsed: runnerName,
        });
      });
    });
  }
}

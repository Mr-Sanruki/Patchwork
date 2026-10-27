import { SandboxExecutionRequest, SandboxExecutionResult, SandboxRunner } from './types.js';
import { LocalDockerRunner } from './local-docker-runner.js';
import { env } from '../../config/env.js';
import { parseTestCounts, sanitizeLogs } from './utils.js';

export class NebiusJobRunner implements SandboxRunner {
  readonly name = 'NebiusJobRunner';
  private fallbackRunner: LocalDockerRunner;
  private endpoint: string;
  private projectId: string;
  private iamToken: string;

  constructor(endpoint?: string, projectId?: string, iamToken?: string) {
    this.endpoint = (endpoint ?? env.NEBIUS_JOBS_ENDPOINT).replace(/\/$/, '');
    this.projectId = projectId ?? env.NEBIUS_PROJECT_ID;
    this.iamToken = iamToken ?? env.NEBIUS_IAM_TOKEN;
    this.fallbackRunner = new LocalDockerRunner();
  }

  get isConfigured(): boolean {
    return Boolean(
      this.projectId &&
      this.iamToken &&
      this.iamToken.trim() !== '' &&
      !this.iamToken.includes('your_')
    );
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isConfigured) return false;
    try {
      const res = await fetch(`${this.endpoint}/projects/${this.projectId}/jobs`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.iamToken}`,
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async run(request: SandboxExecutionRequest): Promise<SandboxExecutionResult> {
    const startTime = Date.now();

    // If Nebius Serverless credentials are not available or not active, fall back cleanly
    const isLive = await this.isAvailable();
    if (!isLive) {
      console.warn(`[NebiusJobRunner] Nebius Serverless Jobs cloud credentials not configured or endpoint unreachable. Running via Local Sandbox Fallback.`);
      const result = await this.fallbackRunner.run(request);
      return {
        ...result,
        runnerUsed: `${this.name} -> ${result.runnerUsed}`,
      };
    }

    try {
      // 1. Submit Nebius Serverless Job
      const jobPayload = {
        name: `patchwork-sandbox-${Date.now()}`,
        projectId: this.projectId,
        spec: {
          container: {
            image: env.DOCKER_IMAGE,
            command: ['sh', '-c', request.command],
            resources: {
              memory: '2Gi',
              cores: 2,
            },
          },
          timeout: `${Math.round((request.timeoutMs ?? 60000) / 1000)}s`,
        },
      };

      const createRes = await fetch(`${this.endpoint}/projects/${this.projectId}/jobs`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.iamToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobPayload),
      });

      if (!createRes.ok) {
        throw new Error(`Failed to submit job to Nebius Serverless: ${createRes.status} ${createRes.statusText}`);
      }

      const jobData = (await createRes.json()) as { id?: string };
      const jobId = jobData.id;
      if (!jobId) {
        throw new Error('Nebius Serverless Jobs API did not return a job ID');
      }

      // 2. Poll for job completion
      let status = 'PENDING';
      const maxPollTime = request.timeoutMs ?? 60000;
      const pollStart = Date.now();

      while (Date.now() - pollStart < maxPollTime) {
        await new Promise((r) => setTimeout(r, 1500));
        const statusRes = await fetch(`${this.endpoint}/projects/${this.projectId}/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${this.iamToken}` },
        });

        if (statusRes.ok) {
          const statusData = (await statusRes.json()) as { status?: string };
          status = statusData.status || 'RUNNING';
          if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'TIMED_OUT') {
            break;
          }
        }
      }

      // 3. Fetch Job Logs
      const logsRes = await fetch(`${this.endpoint}/projects/${this.projectId}/jobs/${jobId}/logs`, {
        headers: { Authorization: `Bearer ${this.iamToken}` },
      });
      const rawLogs = logsRes.ok ? await logsRes.text() : `Job completed with status: ${status}`;
      const logs = sanitizeLogs(rawLogs);
      const durationMs = Date.now() - startTime;
      const { testCount, passCount, failCount } = parseTestCounts(logs);
      const passed = status === 'SUCCEEDED';

      return {
        passed,
        exitCode: passed ? 0 : 1,
        durationMs,
        logs: `[Nebius Serverless Job ${jobId}] Status: ${status}\n${logs}`,
        testCount,
        passCount,
        failCount,
        error: passed ? undefined : `Job finished with status ${status}`,
        runnerUsed: `${this.name} (Nebius Serverless Job ${jobId})`,
      };
    } catch (err) {
      console.warn(`[NebiusJobRunner] Job submission error: ${(err as Error).message}. Delegating to local fallback.`);
      const result = await this.fallbackRunner.run(request);
      return {
        ...result,
        runnerUsed: `${this.name} (Error Fallback) -> ${result.runnerUsed}`,
      };
    }
  }
}

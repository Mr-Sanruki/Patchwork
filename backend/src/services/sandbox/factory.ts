import { SandboxRunner } from './types.js';
import { LocalDockerRunner } from './local-docker-runner.js';
import { NebiusJobRunner } from './nebius-job-runner.js';
import { env } from '../../config/env.js';

export function createSandboxRunner(type?: 'docker' | 'nebius'): SandboxRunner {
  const runnerType = type ?? env.SANDBOX_RUNNER;

  if (runnerType === 'nebius') {
    return new NebiusJobRunner();
  }

  return new LocalDockerRunner();
}

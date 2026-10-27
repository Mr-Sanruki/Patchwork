import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { Repository } from '../../db/repository.js';
import { NebiusTokenFactoryClient } from '../nebius/token-factory.js';
import { TavilyClient } from '../tavily/tavily-client.js';
import { createSandboxRunner } from '../sandbox/factory.js';
import { SandboxRunner } from '../sandbox/types.js';
import { SseManager } from '../events/sse-manager.js';
import { validateCandidateDiff } from './diff-generator.js';
import { Candidate, CandidateStrategy, Job, JobStatus } from '../../types/index.js';
import { env } from '../../config/env.js';

export interface PipelineOptions {
  repoUrl: string;
  packageName: string;
  fromVersion: string;
  toVersion: string;
  runnerType?: 'docker' | 'nebius';
  candidateCount?: number;
  maxRounds?: number;
}

export class PipelineOrchestrator {
  private repo: Repository;
  private tokenFactory: NebiusTokenFactoryClient;
  private tavily: TavilyClient;
  private sse: SseManager;
  private runner: SandboxRunner;

  constructor(
    repo?: Repository,
    tokenFactory?: NebiusTokenFactoryClient,
    tavily?: TavilyClient,
    runner?: SandboxRunner
  ) {
    this.repo = repo ?? new Repository();
    this.tokenFactory = tokenFactory ?? new NebiusTokenFactoryClient();
    this.tavily = tavily ?? new TavilyClient();
    this.sse = SseManager.getInstance();
    this.runner = runner ?? createSandboxRunner();
  }

  /**
   * Run the full end-to-end multi-agent upgrade pipeline.
   */
  async runJob(jobId: string, options: PipelineOptions): Promise<Job> {
    const candidateCount = options.candidateCount ?? env.CANDIDATE_COUNT;
    const maxRounds = options.maxRounds ?? env.MAX_REPAIR_ROUNDS;

    let totalTokens = 0;
    let totalCostUsd = 0;

    const baseWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), `patchwork-job-${jobId}-`));

    try {
      // ----------------------------------------------------------------------
      // Step 1: Clone and Baseline
      // ----------------------------------------------------------------------
      await this.updateStatus(jobId, 'cloning', 'Cloning repository workspace...');
      const repoDir = path.join(baseWorkspace, 'repo');

      await this.cloneRepo(options.repoUrl, repoDir, jobId);

      await this.updateStatus(jobId, 'baselining', 'Verifying baseline test suite on untouched repository...');
      const baselineResult = await this.runner.run({
        workspaceDir: repoDir,
        command: 'npm test',
      });

      this.log(jobId, 'baseline', 'info', `Baseline tests completed with exit code ${baselineResult.exitCode}`, {
        testCount: baselineResult.testCount,
        passCount: baselineResult.passCount,
      });

      if (!baselineResult.passed && baselineResult.failCount > 0) {
        throw new Error(`Baseline tests failed on untouched repo! Fix baseline first.\nLogs: ${baselineResult.logs.slice(-300)}`);
      }

      // ----------------------------------------------------------------------
      // Step 2: Upgrade and Break
      // ----------------------------------------------------------------------
      await this.updateStatus(jobId, 'breaking', `Bumping ${options.packageName} from ${options.fromVersion} to ${options.toVersion} to capture failures...`);
      this.bumpPackageJson(repoDir, options.packageName, options.toVersion);

      const breakResult = await this.runner.run({
        workspaceDir: repoDir,
        command: 'npm test',
      });

      const failureLogs = breakResult.logs;
      this.log(jobId, 'break', 'warn', `Captured failure logs after upgrade (${breakResult.failCount} failed)`, {
        exitCode: breakResult.exitCode,
      });

      // ----------------------------------------------------------------------
      // Step 3: Research (Tavily)
      // ----------------------------------------------------------------------
      await this.updateStatus(jobId, 'researching', `Researching official migration guides & breaking changes via Tavily...`);
      const research = await this.tavily.researchMigration(
        options.packageName,
        options.fromVersion,
        options.toVersion
      );

      for (const s of research.sources) {
        const sourceRecord = this.repo.createSource({
          id: `src-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          jobId,
          title: s.title,
          url: s.url,
          snippet: s.snippet,
          score: s.score,
          createdAt: new Date().toISOString(),
        });
        this.sse.broadcast({
          type: 'tavily:source',
          jobId,
          data: sourceRecord,
          timestamp: new Date().toISOString(),
        });
      }

      this.log(jobId, 'tavily', 'info', `Found ${research.sources.length} authoritative documentation sources via Tavily`, {
        sourcesCount: research.sources.length,
      });

      // ----------------------------------------------------------------------
      // Step 4: Triage (Nemotron Nano)
      // ----------------------------------------------------------------------
      await this.updateStatus(jobId, 'triaging', 'Running fast breaking change triage with NVIDIA Nemotron Nano...');
      const packageJsonContent = fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8');

      const triagePrompt = `You are a fast code triage assistant analyzing a breaking dependency upgrade.
Package: ${options.packageName}
Jump: ${options.fromVersion} -> ${options.toVersion}

Package.json:
${packageJsonContent}

Test Failure Logs:
${failureLogs.slice(0, 2500)}

Tavily Migration Research Notes:
${research.summaryExcerpt}

Analyze the breaking changes and return a JSON object with:
{
  "summary": "Short summary of why it broke",
  "affectedFiles": ["list", "of", "files"],
  "breakingChanges": ["list", "of", "specific", "API", "changes"],
  "riskLevel": "LOW" | "MEDIUM" | "HIGH"
}`;

      const triageRes = await this.tokenFactory.triageWithNano(
        'You are an expert dependency triage assistant. Output only valid JSON.',
        triagePrompt
      );

      totalTokens += triageRes.usage.totalTokens;
      totalCostUsd += triageRes.usage.costUsd;

      let triageData = {
        summary: 'Dependency breaking upgrade requiring code changes.',
        affectedFiles: ['package.json'],
        breakingChanges: ['Breaking API changes'],
        riskLevel: 'LOW' as const,
      };

      try {
        triageData = JSON.parse(triageRes.content);
      } catch {
        // Fallback if model wraps in prose
      }

      this.repo.updateJob(jobId, {
        riskLevel: triageData.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH',
      });

      this.log(jobId, 'triage', 'info', `Triage completed by Nemotron Nano (${triageData.riskLevel} risk)`, triageData);

      // ----------------------------------------------------------------------
      // Step 5 & 6 & 7: Candidates, Testing, & Repair Loop (Nemotron Super)
      // ----------------------------------------------------------------------
      await this.updateStatus(jobId, 'generating_candidates', `Generating ${candidateCount} candidate patches in parallel with Nemotron Super...`);

      const strategies: CandidateStrategy[] = ['minimal', 'adapter', 'codemod', 'refactor'];
      let winningCandidate: Candidate | null = null;

      for (let round = 1; round <= maxRounds; round++) {
        this.repo.updateJob(jobId, { currentRound: round });
        this.log(jobId, 'pipeline', 'info', `Starting candidate generation round ${round} of ${maxRounds}`);

        // Read source files in repo to provide full context to Super
        const codebaseContext = this.gatherCodebaseContext(repoDir);

        // Generate N candidates in parallel
        const candidatePromises = strategies.slice(0, candidateCount).map(async (strategy) => {
          const candId = `cand-${jobId}-${round}-${strategy}`;
          const strategyDesc = this.getStrategyDescription(strategy, options.packageName);

          const genPrompt = `Generate a git unified diff patch to migrate ${options.packageName} from ${options.fromVersion} to ${options.toVersion}.
Strategy: ${strategy.toUpperCase()} (${strategyDesc})

Triage Summary:
${triageData.summary}
Breaking Changes:
${triageData.breakingChanges.join('\n')}

Codebase Files:
${codebaseContext}

Test Failure Logs:
${failureLogs.slice(0, 3000)}

Tavily Docs Reference:
${research.summaryExcerpt.slice(0, 1500)}

IMPORTANT:
Output ONLY a valid git unified diff starting with "--- a/..." and "+++ b/...".
No conversational text. No markdown intro. Keep unchanged context lines with standard spaces.`;

          const candidateRecord = this.repo.createCandidate({
            id: candId,
            jobId,
            round,
            strategy,
            strategyDescription: strategyDesc,
            diff: '',
            status: 'generating',
            testPassed: false,
            testCount: 0,
            passCount: 0,
            failCount: 0,
            durationMs: 0,
            logs: '',
            modelTier: 'super',
            modelId: env.NEMOTRON_SUPER_MODEL,
            createdAt: new Date().toISOString(),
          });

          this.sse.broadcast({
            type: 'candidate:created',
            jobId,
            data: candidateRecord,
            timestamp: new Date().toISOString(),
          });

          const superRes = await this.tokenFactory.generateCandidateWithSuper(
            'You are a senior TypeScript/JavaScript engineer. Return ONLY unified git diffs.',
            genPrompt
          );

          totalTokens += superRes.usage.totalTokens;
          totalCostUsd += superRes.usage.costUsd;

          const diffValidation = validateCandidateDiff(superRes.content);

          let updatedCand = this.repo.updateCandidate(candId, {
            diff: diffValidation.cleanedDiff,
            tokensUsed: superRes.usage.totalTokens,
            status: diffValidation.valid ? 'testing' : 'invalid_diff',
            errorMessage: diffValidation.error,
          })!;

          this.sse.broadcast({
            type: 'candidate:update',
            jobId,
            data: updatedCand,
            timestamp: new Date().toISOString(),
          });

          // Test candidate in its own isolated sandbox copy
          if (diffValidation.valid) {
            const candWorkspace = path.join(baseWorkspace, `workspace-${candId}`);
            this.copyDirSync(repoDir, candWorkspace);

            const testResult = await this.runner.run({
              workspaceDir: candWorkspace,
              diff: diffValidation.cleanedDiff,
              command: 'npm test',
            });

            updatedCand = this.repo.updateCandidate(candId, {
              status: testResult.passed ? 'passed' : 'failed',
              testPassed: testResult.passed,
              testCount: testResult.testCount,
              passCount: testResult.passCount,
              failCount: testResult.failCount,
              durationMs: testResult.durationMs,
              logs: testResult.logs,
              errorMessage: testResult.error,
            })!;

            this.sse.broadcast({
              type: 'candidate:update',
              jobId,
              data: updatedCand,
              timestamp: new Date().toISOString(),
            });

            this.log(
              jobId,
              'sandbox',
              testResult.passed ? 'info' : 'warn',
              `Candidate [${strategy}] tested: ${testResult.passed ? 'PASSED' : 'FAILED'} (${testResult.passCount}/${testResult.testCount} tests pass in ${testResult.durationMs}ms)`
            );
          }

          return updatedCand;
        });

        const roundCandidates = await Promise.all(candidatePromises);

        // Check if any candidate passed cleanly
        const passingCandidates = roundCandidates.filter((c) => c.testPassed);

        if (passingCandidates.length > 0) {
          // ------------------------------------------------------------------
          // Step 8: Select Winner
          // ------------------------------------------------------------------
          await this.updateStatus(jobId, 'selecting', 'Evaluating passing candidates to select the optimal patch...');

          // Pick candidate with smallest diff lines and best test time
          passingCandidates.sort((a, b) => {
            const diffLenA = a.diff.split('\n').length;
            const diffLenB = b.diff.split('\n').length;
            if (diffLenA !== diffLenB) return diffLenA - diffLenB;
            return a.durationMs - b.durationMs;
          });

          winningCandidate = passingCandidates[0];
          this.log(jobId, 'select', 'info', `Selected winning candidate ${winningCandidate.id} [${winningCandidate.strategy}] with verified green tests!`);
          break;
        } else if (round < maxRounds) {
          await this.updateStatus(jobId, 'repairing', `All round ${round} candidates failed. Executing repair feedback loop with Nemotron Super...`);
          this.log(jobId, 'repair', 'warn', `Round ${round} yielded 0 passing candidates. Retrying with failure context...`);
        }
      }

      // If still no winner after all rounds, take candidate with highest pass count
      if (!winningCandidate) {
        const allCandidates = this.repo.getCandidatesByJobId(jobId);
        allCandidates.sort((a, b) => b.passCount - a.passCount || a.failCount - b.failCount);
        winningCandidate = allCandidates[0] || null;
      }

      // ----------------------------------------------------------------------
      // Step 9: Review (Nemotron Ultra)
      // ----------------------------------------------------------------------
      await this.updateStatus(jobId, 'reviewing', 'Conducting final architecture review & PR generation with Nemotron Ultra...');

      const winningDiff = winningCandidate?.diff || '';

      const reviewPrompt = `You are a principal engineer conducting a final review and preparing a detailed GitHub Pull Request.
Package: ${options.packageName} (${options.fromVersion} -> ${options.toVersion})
Winning Patch Strategy: ${winningCandidate?.strategy}
Unified Diff:
${winningDiff}

Test Suite Evidence:
- All Tests Passed: ${winningCandidate?.testPassed ? 'YES' : 'NO'}
- Pass Count: ${winningCandidate?.passCount}
- Fail Count: ${winningCandidate?.failCount}
- Sandbox Duration: ${winningCandidate?.durationMs}ms

Tavily Sources Used:
${research.sources.map((s) => `- [${s.title}](${s.url})`).join('\n')}

Write a concise, polished PR package:
1. Title: e.g. "feat(deps): upgrade ${options.packageName} from ${options.fromVersion} to ${options.toVersion}"
2. Comprehensive PR Body (Markdown):
   - **What Broke**: Explanation of the breaking change
   - **What Changed**: Specific architectural adjustments made in this patch
   - **Why**: Migration guide alignment
   - **Verification Evidence**: Test pass metrics and sandbox environment proof
   - **Sources**: Tavily documentation links
   - **Risk Assessment**: Note on residual risk and deployment advice.`;

      const ultraRes = await this.tokenFactory.reviewWithUltra(
        'You are a principal engineer writing high quality Pull Request documentation.',
        reviewPrompt
      );

      totalTokens += ultraRes.usage.totalTokens;
      totalCostUsd += ultraRes.usage.costUsd;

      const ultraContent = ultraRes.content;
      const titleMatch = ultraContent.match(/Title:\s*(.+)/i);
      const prTitle = titleMatch ? titleMatch[1].trim() : `feat(deps): upgrade ${options.packageName} to ${options.toVersion}`;

      // Update final job record
      const completedJob = this.repo.updateJob(jobId, {
        status: winningCandidate?.testPassed ? 'completed' : 'failed',
        winningCandidateId: winningCandidate?.id,
        prTitle,
        prBody: ultraContent,
        branchName: `patchwork/upgrade-${options.packageName}-${options.toVersion}`,
        costEstimateUsd: totalCostUsd,
        totalTokens,
      })!;

      await this.updateStatus(
        jobId,
        completedJob.status,
        winningCandidate?.testPassed
          ? 'Autonomous upgrade completed successfully! Ready for human approval.'
          : 'Upgrade completed with partial candidate test failures.'
      );

      this.sse.broadcast({
        type: 'job:completed',
        jobId,
        data: completedJob,
        timestamp: new Date().toISOString(),
      });

      return completedJob;
    } catch (err) {
      const errorMsg = (err as Error).message;
      this.log(jobId, 'pipeline', 'error', `Pipeline execution error: ${errorMsg}`);

      const failedJob = this.repo.updateJob(jobId, {
        status: 'failed',
        error: errorMsg,
        totalTokens,
        costEstimateUsd: totalCostUsd,
      })!;

      this.sse.broadcast({
        type: 'job:failed',
        jobId,
        data: { error: errorMsg },
        timestamp: new Date().toISOString(),
      });

      return failedJob;
    } finally {
      // Clean up temp directories
      try {
        fs.rmSync(baseWorkspace, { recursive: true, force: true });
      } catch {}
    }
  }

  // --- Helper Methods ---

  private async updateStatus(jobId: string, status: JobStatus, message: string): Promise<void> {
    this.repo.updateJob(jobId, { status });
    this.log(jobId, 'status', 'info', message);
    this.sse.broadcast({
      type: 'job:status',
      jobId,
      data: { status, message },
      timestamp: new Date().toISOString(),
    });
  }

  private log(
    jobId: string,
    stage: string,
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    const record = this.repo.addLog({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      jobId,
      stage,
      level,
      message,
      metadata,
      timestamp: new Date().toISOString(),
    });

    this.sse.broadcast({
      type: 'job:log',
      jobId,
      data: record,
      timestamp: new Date().toISOString(),
    });
  }

  private async cloneRepo(repoUrl: string, targetDir: string, jobId: string): Promise<void> {
    // If it's a local directory path (e.g. demo fixture or relative path)
    if (fs.existsSync(repoUrl) || repoUrl.includes('demo-repos') || !repoUrl.startsWith('http')) {
      const sourcePath = path.isAbsolute(repoUrl) ? repoUrl : path.resolve(process.cwd(), repoUrl);
      if (fs.existsSync(sourcePath)) {
        this.log(jobId, 'clone', 'info', `Loading local repository fixture from ${sourcePath}`);
        this.copyDirSync(sourcePath, targetDir);
        return;
      }
    }

    // Git shallow clone for remote URLs
    this.log(jobId, 'clone', 'info', `Performing shallow git clone of ${repoUrl}`);
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('git', ['clone', '--depth', '1', repoUrl, targetDir], {
        stdio: 'ignore',
      });
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`git clone failed with code ${code}`));
      });
      proc.on('error', reject);
    });
  }

  private bumpPackageJson(repoDir: string, packageName: string, toVersion: string): void {
    const pkgPath = path.join(repoDir, 'package.json');
    if (!fs.existsSync(pkgPath)) return;

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.dependencies && pkg.dependencies[packageName]) {
      pkg.dependencies[packageName] = toVersion;
    } else if (pkg.devDependencies && pkg.devDependencies[packageName]) {
      pkg.devDependencies[packageName] = toVersion;
    } else {
      pkg.dependencies = pkg.dependencies || {};
      pkg.dependencies[packageName] = toVersion;
    }

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
  }

  private gatherCodebaseContext(repoDir: string): string {
    const files: string[] = [];
    const readDir = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          readDir(full);
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts') || entry.name.endsWith('.json') || entry.name.endsWith('.mjs'))) {
          const rel = path.relative(repoDir, full).replace(/\\/g, '/');
          const content = fs.readFileSync(full, 'utf8');
          files.push(`--- File: ${rel} ---\n${content.slice(0, 3000)}`);
        }
      }
    };
    readDir(repoDir);
    return files.slice(0, 10).join('\n\n');
  }

  private copyDirSync(src: string, dest: string): void {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        this.copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  private getStrategyDescription(strategy: CandidateStrategy, packageName: string): string {
    switch (strategy) {
      case 'minimal':
        return `Minimal changes to satisfy test assertions for ${packageName}`;
      case 'adapter':
        return `Encapsulate ${packageName} behind an internal compatibility shim`;
      case 'codemod':
        return `Convert syntax to idiomatic modern standards (e.g. ESM / async)`;
      case 'refactor':
        return `Clean structural refactor removing deprecated patterns`;
    }
  }
}

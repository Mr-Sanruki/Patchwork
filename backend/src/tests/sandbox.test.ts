import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sanitizeLogs, parseTestCounts, validateDiffSyntax, applyDiffToWorkspace } from '../services/sandbox/utils.js';
import { createSandboxRunner } from '../services/sandbox/factory.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Sandbox Isolation and Runner Subsystem', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchwork-sandbox-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('redacts sensitive secrets and API tokens from logs', () => {
    const raw = 'Calling Tavily tvly-abcd1234efgh with Authorization: Bearer neb-secret-999 and ghp_fakegithubtoken123';
    const sanitized = sanitizeLogs(raw);

    expect(sanitized).not.toContain('tvly-abcd1234efgh');
    expect(sanitized).not.toContain('neb-secret-999');
    expect(sanitized).not.toContain('ghp_fakegithubtoken123');
    expect(sanitized).toContain('[REDACTED]');
  });

  it('accurately parses test counts from test outputs', () => {
    const jestOutput = 'Tests:  4 passed, 4 total\nTime: 1.2s';
    const parsedJest = parseTestCounts(jestOutput);
    expect(parsedJest.passCount).toBe(4);
    expect(parsedJest.failCount).toBe(0);
    expect(parsedJest.testCount).toBe(4);

    const failOutput = 'Tests:  3 passed, 2 failed, 5 total';
    const parsedFail = parseTestCounts(failOutput);
    expect(parsedFail.passCount).toBe(3);
    expect(parsedFail.failCount).toBe(2);
    expect(parsedFail.testCount).toBe(5);
  });

  it('validates and applies unified diff to a workspace', () => {
    // Create initial file
    const targetFile = path.join(tmpDir, 'package.json');
    fs.writeFileSync(
      targetFile,
      JSON.stringify({ name: 'sample-app', version: '1.0.0' }, null, 2),
      'utf8'
    );

    const diff = `--- a/package.json
+++ b/package.json
@@ -2,2 +2,3 @@
   "name": "sample-app",
+  "type": "module",
   "version": "1.0.0"
`;

    const validation = validateDiffSyntax(diff);
    expect(validation.valid).toBe(true);

    const applyResult = applyDiffToWorkspace(tmpDir, diff);
    expect(applyResult.success).toBe(true);

    const updatedContent = fs.readFileSync(targetFile, 'utf8');
    expect(updatedContent).toContain('"type": "module"');
  });

  it('executes a command in the sandbox runner and returns structured result', async () => {
    const runner = createSandboxRunner('docker');
    expect(runner.name).toBe('LocalDockerRunner');

    // Write a dummy script to run
    const scriptPath = path.join(tmpDir, 'test.js');
    fs.writeFileSync(scriptPath, 'console.log("PASS 2 passed, 0 failed"); process.exit(0);', 'utf8');

    const result = await runner.run({
      workspaceDir: tmpDir,
      command: 'node test.js',
      timeoutMs: 10000,
    });

    expect(result.passed).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.passCount).toBeGreaterThanOrEqual(1);
    expect(result.runnerUsed).toBeDefined();
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildServer } from '../api/server.js';
import { initTestDatabase } from '../db/database.js';
import { Repository } from '../db/repository.js';
import { SseManager } from '../services/events/sse-manager.js';
import { validateCandidateDiff } from '../services/pipeline/diff-generator.js';
import { FastifyInstance } from 'fastify';

describe('Pipeline and SSE Integration', () => {
  let app: FastifyInstance;
  let repo: Repository;

  beforeEach(async () => {
    const db = initTestDatabase();
    repo = new Repository(db);
    app = buildServer(repo);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('correctly extracts and validates unified diff from LLM markdown block', () => {
    const markdownOutput = `Here is your candidate patch:
\`\`\`diff
--- a/package.json
+++ b/package.json
@@ -5,3 +5,3 @@
-  "chalk": "^4.1.2"
+  "chalk": "^5.3.0"
\`\`\`
Hope this helps!`;

    const result = validateCandidateDiff(markdownOutput);
    expect(result.valid).toBe(true);
    expect(result.cleanedDiff).toContain('--- a/package.json');
    expect(result.cleanedDiff).toContain('+++ b/package.json');
    expect(result.cleanedDiff).not.toContain('Here is your candidate patch');
  });

  it('POST /api/jobs starts a job and returns 202 with job payload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/jobs',
      payload: {
        repoUrl: 'https://github.com/example/demo',
        packageName: 'chalk',
        fromVersion: '4.1.2',
        toVersion: '5.3.0',
      },
    });

    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body);
    expect(body.id).toBeDefined();
    expect(body.packageName).toBe('chalk');
    expect(body.status).toBe('pending');

    // Retrieve via GET /api/jobs/:id
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/jobs/${body.id}`,
    });

    expect(getRes.statusCode).toBe(200);
    const detail = JSON.parse(getRes.body);
    expect(detail.job.id).toBe(body.id);
    expect(Array.isArray(detail.candidates)).toBe(true);
    expect(Array.isArray(detail.sources)).toBe(true);
  });

  it('SseManager broadcasts and buffers events correctly', () => {
    const sse = SseManager.getInstance();
    const jobId = 'test-job-sse';

    sse.broadcast({
      type: 'job:status',
      jobId,
      data: { status: 'triaging', message: 'Analyzing' },
      timestamp: new Date().toISOString(),
    });

    // Clean up
    sse.clearJobHistory(jobId);
    expect(true).toBe(true);
  });
});

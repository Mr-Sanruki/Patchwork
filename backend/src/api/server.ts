import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { getSanitizedConfig, env } from '../config/env.js';
import { Repository } from '../db/repository.js';
import { SseManager } from '../services/events/sse-manager.js';
import { PipelineOrchestrator } from '../services/pipeline/pipeline-orchestrator.js';
import { createSandboxRunner } from '../services/sandbox/factory.js';
import { Job } from '../types/index.js';

interface CreateJobBody {
  repoUrl: string;
  packageName: string;
  fromVersion: string;
  toVersion: string;
  runnerType?: 'docker' | 'nebius';
  candidateCount?: number;
  maxRounds?: number;
}

export function buildServer(repo?: Repository): FastifyInstance {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
    },
  });

  fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  const repository = repo || new Repository();
  const sseManager = SseManager.getInstance();

  // Root welcome
  fastify.get('/', async () => {
    return {
      name: 'Patchwork Engine API',
      tagline: 'Dependency upgrades that fix themselves, and prove it.',
      version: '1.0.0',
      status: 'online',
    };
  });

  // Health check endpoint
  fastify.get('/api/health', async () => {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: 'patchwork-backend',
    };
  });

  // Configuration check (sanitized, safe)
  fastify.get('/api/config', async () => {
    return getSanitizedConfig();
  });

  // Nebius Token Factory runtime model discovery endpoint
  fastify.get('/api/models', async () => {
    const { NebiusTokenFactoryClient } = await import('../services/nebius/token-factory.js');
    const client = new NebiusTokenFactoryClient();
    const models = await client.discoverModels();
    return {
      status: 'ok',
      ...models,
    };
  });

  // --- Pipeline & Jobs API ---

  // POST /api/jobs: Create and launch an upgrade job
  fastify.post('/api/jobs', async (req: FastifyRequest<{ Body: CreateJobBody }>, reply: FastifyReply) => {
    const { repoUrl, packageName, fromVersion, toVersion, runnerType, candidateCount, maxRounds } = req.body || {};

    if (!repoUrl || !packageName || !fromVersion || !toVersion) {
      return reply.status(400).send({
        error: 'Missing required parameters: repoUrl, packageName, fromVersion, toVersion',
      });
    }

    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newJob: Job = {
      id: jobId,
      repoUrl,
      packageName,
      fromVersion,
      toVersion,
      status: 'pending',
      currentRound: 1,
      maxRounds: maxRounds ?? env.MAX_REPAIR_ROUNDS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    repository.createJob(newJob);

    // Launch pipeline asynchronously
    const runner = createSandboxRunner(runnerType);
    const orchestrator = new PipelineOrchestrator(repository, undefined, undefined, runner);

    // Run in background without blocking response
    setImmediate(() => {
      orchestrator.runJob(jobId, {
        repoUrl,
        packageName,
        fromVersion,
        toVersion,
        runnerType,
        candidateCount,
        maxRounds,
      }).catch((err) => {
        fastify.log.error(`Background job ${jobId} failed:`, err);
      });
    });

    return reply.status(202).send(newJob);
  });

  // GET /api/jobs: List recent jobs
  fastify.get('/api/jobs', async (req: FastifyRequest<{ Querystring: { limit?: string } }>) => {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    return repository.listJobs(limit);
  });

  // GET /api/jobs/:id: Get full job details with candidates, sources, logs
  fastify.get('/api/jobs/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const job = repository.getJob(id);

    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }

    const candidates = repository.getCandidatesByJobId(id);
    const sources = repository.getSourcesByJobId(id);
    const logs = repository.getLogsByJobId(id);

    return {
      job,
      candidates,
      sources,
      logs,
    };
  });

  // GET /api/jobs/:id/events: Server-Sent Events stream
  fastify.get('/api/jobs/:id/events', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    sseManager.registerClient(id, reply);
  });

  // GET /api/jobs/:id/diff: Retrieve the winning candidate diff
  fastify.get('/api/jobs/:id/diff', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const job = repository.getJob(id);
    if (!job) return reply.status(404).send({ error: 'Job not found' });

    if (!job.winningCandidateId) {
      return reply.status(404).send({ error: 'No winning candidate selected yet' });
    }

    const winner = repository.getCandidate(job.winningCandidateId);
    if (!winner) return reply.status(404).send({ error: 'Winning candidate not found' });

    reply.type('text/plain; charset=utf-8');
    return winner.diff;
  });

  // GET /api/jobs/:id/patch: Download patch file
  fastify.get('/api/jobs/:id/patch', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const job = repository.getJob(id);
    if (!job) return reply.status(404).send({ error: 'Job not found' });

    const winner = job.winningCandidateId ? repository.getCandidate(job.winningCandidateId) : null;
    const diff = winner?.diff || '# No diff generated\n';

    reply.header('Content-Disposition', `attachment; filename="patchwork-${job.packageName}-${job.toVersion}.patch"`);
    reply.type('text/x-diff; charset=utf-8');
    return diff;
  });

  // GET /api/benchmarks: List benchmark comparison records
  fastify.get('/api/benchmarks', async () => {
    return repository.listBenchmarks();
  });

  return fastify;
}

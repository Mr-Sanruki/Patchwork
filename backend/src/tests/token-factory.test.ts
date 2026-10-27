import { describe, it, expect } from 'vitest';
import { NebiusTokenFactoryClient } from '../services/nebius/token-factory.js';
import { estimateCostUsd } from '../services/nebius/pricing.js';
import { buildServer } from '../api/server.js';
import { initTestDatabase } from '../db/database.js';
import { Repository } from '../db/repository.js';

describe('Nebius Token Factory Client & Pricing', () => {
  it('calculates cost accurately based on model tier and tokens', () => {
    // 100k input, 50k output for 70B model ($0.60/1M input, $0.80/1M output)
    const cost = estimateCostUsd('nvidia/Llama-3.1-Nemotron-70B-Instruct-HF', 100_000, 50_000);
    // (0.1 * 0.60) + (0.05 * 0.80) = 0.06 + 0.04 = 0.10
    expect(cost).toBeCloseTo(0.10, 4);

    // Nano tier
    const nanoCost = estimateCostUsd('nvidia/nemotron-mini-4b-instruct', 1_000_000, 1_000_000);
    expect(nanoCost).toBeCloseTo(0.20, 2);
  });

  it('discovers 3 tiers correctly', async () => {
    const client = new NebiusTokenFactoryClient('test-key');
    const models = await client.discoverModels();

    expect(models.nano).toBeDefined();
    expect(models.super).toBeDefined();
    expect(models.ultra).toBeDefined();
    expect(models.allModels.length).toBeGreaterThanOrEqual(3);
  });

  it('routes triage to Nano and generates structured JSON output', async () => {
    const client = new NebiusTokenFactoryClient();
    const result = await client.triageWithNano(
      'You are a fast code triage assistant.',
      'Analyze breaking changes for chalk 4 -> 5.'
    );

    expect(result.content).toBeDefined();
    expect(result.usage.totalTokens).toBeGreaterThan(0);
    expect(result.usage.costUsd).toBeGreaterThanOrEqual(0);

    const parsed = JSON.parse(result.content);
    expect(parsed.affectedFiles).toBeDefined();
    expect(parsed.breakingChanges).toBeDefined();
  });

  it('routes candidate generation to Super tier', async () => {
    const client = new NebiusTokenFactoryClient();
    const result = await client.generateCandidateWithSuper(
      'You are a code migration agent.',
      'Generate candidate patch for chalk upgrade'
    );

    expect(result.content).toBeDefined();
    expect(result.usage.totalTokens).toBeGreaterThan(0);
  });

  it('routes final review to Ultra tier', async () => {
    const client = new NebiusTokenFactoryClient();
    const result = await client.reviewWithUltra(
      'You are a senior code reviewer.',
      'Review winning patch'
    );

    expect(result.content).toBeDefined();
    expect(result.usage.totalTokens).toBeGreaterThan(0);
  });

  it('GET /api/models returns 3 tiers via API', async () => {
    const db = initTestDatabase();
    const app = buildServer(new Repository(db));
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/models',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.nano).toBeDefined();
    expect(body.super).toBeDefined();
    expect(body.ultra).toBeDefined();

    await app.close();
  });
});

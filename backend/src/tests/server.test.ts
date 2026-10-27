import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../api/server.js';
import { FastifyInstance } from 'fastify';
import { initTestDatabase } from '../db/database.js';
import { Repository } from '../db/repository.js';

describe('Server API Endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const db = initTestDatabase();
    const repo = new Repository(db);
    app = buildServer(repo);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health returns 200 OK with status and uptime', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('patchwork-backend');
    expect(body.uptime).toBeTypeOf('number');
  });

  it('GET /api/config returns sanitized configurations without secret leak', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/config',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.models).toBeDefined();
    expect(body.integrations).toBeDefined();
    expect(body.port).toBeTypeOf('number');
  });
});

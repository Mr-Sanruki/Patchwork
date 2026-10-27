import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { getSanitizedConfig } from '../config/env.js';
import { Repository } from '../db/repository.js';

export function buildServer(repo?: Repository): FastifyInstance {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
    },
  });

  // Enable CORS for frontend development and production preview
  fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  const repository = repo || new Repository();

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

  return fastify;
}

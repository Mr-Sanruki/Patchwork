import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from workspace root if present, or backend
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_PATH: z.string().default('./data/patchwork.db'),

  // Nebius Token Factory (NVIDIA Nemotron Models)
  NEBIUS_API_KEY: z.string().default(''),
  NEBIUS_BASE_URL: z.string().default('https://api.studio.nebius.ai/v1'),
  NEMOTRON_NANO_MODEL: z.string().default('nvidia/nemotron-mini-4b-instruct'),
  NEMOTRON_SUPER_MODEL: z.string().default('nvidia/Llama-3.1-Nemotron-70B-Instruct-HF'),
  NEMOTRON_ULTRA_MODEL: z.string().default('nvidia/Llama-3.1-Nemotron-70B-Instruct-HF'),

  // Tavily Search & Extract
  TAVILY_API_KEY: z.string().default(''),

  // Sandbox Runner
  SANDBOX_RUNNER: z.enum(['docker', 'nebius']).default('docker'),
  NEBIUS_PROJECT_ID: z.string().default(''),
  NEBIUS_IAM_TOKEN: z.string().default(''),
  NEBIUS_JOBS_ENDPOINT: z.string().default('https://api.serverless.nebius.ai/v1'),
  DOCKER_IMAGE: z.string().default('node:20-alpine'),
  DOCKER_TIMEOUT_MS: z.coerce.number().default(60000),

  // GitHub Integration
  GITHUB_TOKEN: z.string().default(''),

  // Pipeline Config
  CANDIDATE_COUNT: z.coerce.number().default(4),
  MAX_REPAIR_ROUNDS: z.coerce.number().default(3),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    for (const issue of error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
  }
  throw error;
}

export const env = parsedEnv;

export function getSanitizedConfig() {
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    host: env.HOST,
    databasePath: env.DATABASE_PATH,
    sandboxRunner: env.SANDBOX_RUNNER,
    candidateCount: env.CANDIDATE_COUNT,
    maxRepairRounds: env.MAX_REPAIR_ROUNDS,
    nebiusBaseUrl: env.NEBIUS_BASE_URL,
    models: {
      nano: env.NEMOTRON_NANO_MODEL,
      super: env.NEMOTRON_SUPER_MODEL,
      ultra: env.NEMOTRON_ULTRA_MODEL,
    },
    integrations: {
      hasNebiusApiKey: Boolean(env.NEBIUS_API_KEY && env.NEBIUS_API_KEY !== 'your_nebius_api_key_here'),
      hasTavilyApiKey: Boolean(env.TAVILY_API_KEY && !env.TAVILY_API_KEY.includes('your_tavily')),
      hasGithubToken: Boolean(env.GITHUB_TOKEN && env.GITHUB_TOKEN.length > 5),
      hasNebiusServerlessConfig: Boolean(env.NEBIUS_PROJECT_ID && env.NEBIUS_IAM_TOKEN),
    },
  };
}

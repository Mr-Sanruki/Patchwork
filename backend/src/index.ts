import { buildServer } from './api/server.js';
import { env, getSanitizedConfig } from './config/env.js';
import { getDatabase } from './db/database.js';

async function main() {
  console.log('🚀 Starting Patchwork Engine...');
  console.log(`📡 Environment: ${env.NODE_ENV}`);

  // Initialize SQLite database
  try {
    getDatabase();
    console.log('📦 Database initialized at:', env.DATABASE_PATH);
  } catch (err) {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
  }

  const server = buildServer();

  try {
    const address = await server.listen({
      port: env.PORT,
      host: env.HOST,
    });
    console.log(`✨ Patchwork Backend listening on ${address}`);
    console.log('🔍 Active configuration:', JSON.stringify(getSanitizedConfig(), null, 2));
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

// Run if called directly
if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  main();
}

export { main };

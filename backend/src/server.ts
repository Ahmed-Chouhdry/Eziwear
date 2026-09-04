import { createApp } from './app.js';
import { assertDbConnection, closeDb } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

async function main(): Promise<void> {
  try {
    await assertDbConnection();
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      'Database not reachable at startup — start it with `docker compose up -d` (server will keep running)',
    );
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`EZiWear API listening on http://localhost:${env.PORT}/api/v1`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${env.PORT} is already in use. Set PORT in .env to a free port.`);
    } else {
      logger.error({ err }, 'Server error');
    }
    process.exit(1);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await closeDb();
      logger.info('Closed cleanly');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
}

void main();

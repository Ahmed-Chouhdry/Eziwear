import knexFactory, { type Knex } from 'knex';
import { env } from './env.js';
import { logger } from './logger.js';

export const db: Knex = knexFactory({
  client: 'mysql2',
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    charset: 'utf8mb4',
    timezone: 'Z',
    dateStrings: true,
    decimalNumbers: true,
  },
  pool: { min: 2, max: 10 },
});

export async function assertDbConnection(): Promise<void> {
  await db.raw('select 1');
  logger.info(`Database connected — ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
}

export async function closeDb(): Promise<void> {
  await db.destroy();
}

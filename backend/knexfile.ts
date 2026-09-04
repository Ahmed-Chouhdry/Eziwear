import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Knex } from 'knex';

// Standalone (no imports from src/) so the knex CLI can load it directly.
const here = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(here, '../.env') });
loadDotenv();

const connection: Knex.MySql2ConnectionConfig = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3307),
  user: process.env.DB_USER ?? 'eziwear',
  password: process.env.DB_PASSWORD ?? 'eziwear',
  database: process.env.DB_NAME ?? 'eziwear',
  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: true,
  decimalNumbers: true,
};

const base: Knex.Config = {
  client: 'mysql2',
  connection,
  pool: { min: 2, max: 10 },
  migrations: {
    directory: path.join(here, 'src/database/migrations'),
    extension: 'ts',
    loadExtensions: ['.ts', '.js'],
    tableName: 'knex_migrations',
    stub: path.join(here, 'src/database/migration.stub'),
  },
  seeds: {
    directory: path.join(here, 'src/database/seeds'),
    extension: 'ts',
    loadExtensions: ['.ts', '.js'],
  },
};

const config: Record<string, Knex.Config> = {
  development: base,
  test: base,
  production: base,
};

export default config;

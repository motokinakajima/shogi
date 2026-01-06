import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';

const dialect = new PostgresDialect({
  pool: new pg.Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'app_db',
    user: process.env.POSTGRES_USER || 'app',
    password: process.env.POSTGRES_PASSWORD || 'app',
    max: 10, // コネクションプール最大数
  }),
});

export const db = new Kysely({
  dialect,
});
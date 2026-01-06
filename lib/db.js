import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';

const dialect = new PostgresDialect({
  pool: new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'app_db',
    user: process.env.DB_USER || 'app',
    password: process.env.DB_PASSWORD || 'app',
    max: 10, // コネクションプール最大数
  }),
});

export const db = new Kysely({
  dialect,
});
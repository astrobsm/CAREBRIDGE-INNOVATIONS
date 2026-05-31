require('dotenv').config();
const { Pool } = require('pg');

// Optional Supabase / Postgres schema isolation (Part C integration with
// AstroHEALTH). When DB_SCHEMA is set (e.g. "family"), every new connection
// is pinned to that search_path so unqualified table names in routes/models
// resolve into the family schema without conflicting with AstroHEALTH tables.
const DB_SCHEMA = process.env.DB_SCHEMA || 'family';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'family_app',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: (process.env.DB_SSL === 'true' || /supabase\.(co|com)/i.test(process.env.DB_HOST || ''))
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', (client) => {
  if (DB_SCHEMA) {
    client.query(`SET search_path TO ${DB_SCHEMA}, public`).catch((err) => {
      console.error('Failed to set search_path:', err.message);
    });
  }
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};

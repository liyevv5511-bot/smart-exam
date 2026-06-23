import { Pool, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  // İdarə olunan PostgreSQL (Railway/Render/Supabase) çox vaxt SSL tələb edir.
  // Hostinqdə DATABASE_SSL=true təyin edin.
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Gözlənilməz PostgreSQL xətası:', err);
});

export const query = <T extends QueryResultRow = any>(text: string, params?: any[]) =>
  pool.query<T>(text, params);

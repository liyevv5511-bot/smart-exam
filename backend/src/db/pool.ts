import { Pool, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const useSSL = process.env.DATABASE_SSL === 'true';

/**
 * Bağlantı sətrini təmizləyir: SSL-i biz özümüz idarə etdiyimiz üçün
 * "channel_binding=require" (Neon) auth-u poza bilər — onu çıxarırıq.
 */
function cleanUrl(url?: string): string | undefined {
  if (!url || !useSSL) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete('channel_binding');
    u.searchParams.delete('sslmode');
    return u.toString();
  } catch {
    return url;
  }
}

export const pool = new Pool({
  connectionString: cleanUrl(process.env.DATABASE_URL),
  max: 10,
  idleTimeoutMillis: 30000,
  // İdarə olunan PostgreSQL (Render/Neon/Supabase) SSL tələb edir → DATABASE_SSL=true
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Gözlənilməz PostgreSQL xətası:', err);
});

export const query = <T extends QueryResultRow = any>(text: string, params?: any[]) =>
  pool.query<T>(text, params);

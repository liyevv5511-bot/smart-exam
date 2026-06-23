import fs from 'fs';
import path from 'path';
import { pool } from './pool';

/** Verilənlər bazası hazır olana qədər gözləyir (hostinqdə DB gec qalxa bilər). */
async function waitForDb(retries = 10) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (e: any) {
      // Əsl xətanı göstər ki, problemi (parol/host/SSL) görək
      console.log(`⏳ DB hazır deyil (${i}/${retries}) — xəta: ${e?.message || e}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error('Verilənlər bazasına qoşulmaq mümkün olmadı.');
}

/** schema.sql faylını icra edərək bütün cədvəlləri yaradır. */
async function init() {
  await waitForDb();
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('✅ Verilənlər bazası sxemi uğurla yaradıldı.');
  await pool.end();
}

init().catch((e) => {
  console.error('❌ Sxem yaradılarkən xəta:', e);
  process.exit(1);
});

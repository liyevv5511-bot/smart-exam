import fs from 'fs';
import path from 'path';
import { pool } from './pool';

/**
 * DİQQƏT: bütün cədvəlləri silib yenidən yaradır (bütün məlumat itir).
 * İşə salmaq:  npm run db:reset
 */
async function reset() {
  await pool.query(`
    DROP VIEW IF EXISTS user_stats CASCADE;
    DROP TABLE IF EXISTS exam_answers, exam_sessions, questions, tests,
                         password_resets, notifications, users CASCADE;
  `);
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('✅ Verilənlər bazası sıfırlandı və yenidən quruldu.');
  await pool.end();
}

reset().catch((e) => {
  console.error('❌ Reset xətası:', e);
  process.exit(1);
});

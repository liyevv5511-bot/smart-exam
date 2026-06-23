import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { pool } from './pool';

dotenv.config();

/** İlk admin hesabını yaradır (təkrarlanarsa yenilənmir). */
async function seed() {
  const email = process.env.ADMIN_EMAIL || 'admin@exam.local';
  const password = process.env.ADMIN_PASSWORD || 'Admin12345!';
  const name = process.env.ADMIN_NAME || 'Sistem Admini';
  const hash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    [name, email, hash]
  );

  console.log(`✅ Admin hazırdır → ${email} / ${password}`);
  await pool.end();
}

seed().catch((e) => {
  console.error('❌ Seed xətası:', e);
  process.exit(1);
});

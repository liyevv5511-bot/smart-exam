import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { query } from '../db/pool';
import { signToken } from '../utils/jwt';
import { authRequired, AuthedRequest } from '../middleware/auth';

const router = Router();

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Ad ən azı 2 simvol olmalıdır.'),
    email: z.string().email('Düzgün e-poçt daxil edin.'),
    password: z.string().min(6, 'Şifrə ən azı 6 simvol olmalıdır.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Şifrələr uyğun gəlmir.',
    path: ['confirmPassword'],
  });

// ---------- Qeydiyyat ----------
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { fullName, email, password } = parsed.data;

  const exists = await query('SELECT 1 FROM users WHERE email=$1', [email.toLowerCase()]);
  if (exists.rowCount) {
    return res.status(409).json({ error: 'Bu e-poçt artıq qeydiyyatdan keçib.' });
  }
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await query(
    `INSERT INTO users (full_name, email, password_hash)
     VALUES ($1,$2,$3) RETURNING id, full_name, email, role`,
    [fullName, email.toLowerCase(), hash]
  );
  const u = rows[0];
  const token = signToken({ sub: u.id, role: u.role, email: u.email });
  res.status(201).json({ token, user: u });
});

// ---------- Giriş ----------
router.post('/login', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
    remember: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Yanlış məlumat.' });

  const { email, password, remember } = parsed.data;
  const { rows } = await query(
    'SELECT id, full_name, email, role, avatar_url, password_hash, is_active FROM users WHERE email=$1',
    [email.toLowerCase()]
  );
  const u = rows[0];
  if (!u) return res.status(401).json({ error: 'E-poçt və ya şifrə yanlışdır.' });
  if (!u.is_active) {
    return res
      .status(403)
      .json({ error: 'Hesabınız deaktiv edilib. Admin ilə əlaqə saxlayın.', code: 'ACCOUNT_DISABLED' });
  }
  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) return res.status(401).json({ error: 'E-poçt və ya şifrə yanlışdır.' });

  const token = signToken({ sub: u.id, role: u.role, email: u.email }, !!remember);
  res.json({
    token,
    user: { id: u.id, full_name: u.full_name, email: u.email, role: u.role, avatar_url: u.avatar_url },
  });
});

// ---------- Cari istifadəçi ----------
router.get('/me', authRequired, async (req: AuthedRequest, res) => {
  const { rows } = await query(
    'SELECT id, full_name, email, role, avatar_url, created_at FROM users WHERE id=$1',
    [req.user!.sub]
  );
  res.json({ user: rows[0] });
});

// ---------- Şifrəni unutdum (token yaradır) ----------
router.post('/forgot-password', async (req, res) => {
  const email = String(req.body.email || '').toLowerCase();
  const { rows } = await query('SELECT id FROM users WHERE email=$1', [email]);
  // İstifadəçi mövcudluğunu sızdırmamaq üçün həmişə eyni cavab
  if (rows[0]) {
    const raw = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    await query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at)
       VALUES ($1,$2, now() + interval '1 hour')`,
      [rows[0].id, tokenHash]
    );
    // İstehsalda: bu tokeni e-poçtla göndərin. Demo üçün cavabda qaytarırıq.
    return res.json({
      message: 'Bərpa linki göndərildi (demo).',
      resetToken: raw,
    });
  }
  res.json({ message: 'Əgər hesab mövcuddursa, bərpa linki göndərildi.' });
});

// ---------- Şifrəni sıfırla ----------
router.post('/reset-password', async (req, res) => {
  const schema = z.object({
    token: z.string().min(10),
    password: z.string().min(6),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Yanlış məlumat.' });

  const tokenHash = crypto
    .createHash('sha256')
    .update(parsed.data.token)
    .digest('hex');
  const { rows } = await query(
    `SELECT id, user_id FROM password_resets
     WHERE token_hash=$1 AND used=false AND expires_at > now()`,
    [tokenHash]
  );
  if (!rows[0]) {
    return res.status(400).json({ error: 'Token etibarsız və ya vaxtı keçib.' });
  }
  const hash = await bcrypt.hash(parsed.data.password, 12);
  await query('UPDATE users SET password_hash=$1, updated_at=now() WHERE id=$2', [
    hash,
    rows[0].user_id,
  ]);
  await query('UPDATE password_resets SET used=true WHERE id=$1', [rows[0].id]);
  res.json({ message: 'Şifrə uğurla yeniləndi.' });
});

export default router;

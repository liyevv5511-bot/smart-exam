import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/pool';
import { authRequired, AuthedRequest } from '../middleware/auth';

const router = Router();
router.use(authRequired);

// ---------- Profili yenilə ----------
router.put('/', async (req: AuthedRequest, res) => {
  const schema = z.object({
    fullName: z.string().min(2),
    // data:image/... (base64) və ya http(s) URL — maks ~1.5MB
    avatarUrl: z.string().max(1_500_000).nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Yanlış məlumat.' });

  const { rows } = await query(
    `UPDATE users SET full_name=$1, avatar_url=$2, updated_at=now()
     WHERE id=$3 RETURNING id, full_name, email, role, avatar_url`,
    [parsed.data.fullName, parsed.data.avatarUrl ?? null, req.user!.sub]
  );
  res.json({ user: rows[0] });
});

// ---------- Şifrəni dəyiş ----------
router.put('/password', async (req: AuthedRequest, res) => {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Yeni şifrə ən azı 6 simvol.' });

  const u = await query('SELECT password_hash FROM users WHERE id=$1', [req.user!.sub]);
  const ok = await bcrypt.compare(parsed.data.currentPassword, u.rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: 'Cari şifrə yanlışdır.' });

  const hash = await bcrypt.hash(parsed.data.newPassword, 12);
  await query('UPDATE users SET password_hash=$1, updated_at=now() WHERE id=$2', [
    hash,
    req.user!.sub,
  ]);
  res.json({ message: 'Şifrə yeniləndi.' });
});

// ---------- İmtahan tarixçəsi ----------
router.get('/history', async (req: AuthedRequest, res) => {
  const { rows } = await query(
    `SELECT s.id, t.title AS test_title, s.mode, s.score, s.grade, s.total,
            s.correct_count, s.wrong_count, s.submitted_at
     FROM exam_sessions s JOIN tests t ON t.id=s.test_id
     WHERE s.user_id=$1 AND s.status='submitted'
     ORDER BY s.submitted_at DESC`,
    [req.user!.sub]
  );
  res.json({ history: rows });
});

export default router;

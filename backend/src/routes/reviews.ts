import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { authRequired, AuthedRequest } from '../middleware/auth';

const router = Router();

// ---------- İCTİMAİ: son rəylər (login səhifəsi üçün, auth tələb etmir) ----------
router.get('/public', async (_req, res) => {
  const { rows } = await query(
    `SELECT r.rating, r.comment, r.created_at,
            u.full_name, u.avatar_url
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.is_visible = true AND r.comment IS NOT NULL AND r.comment <> ''
     ORDER BY r.created_at DESC
     LIMIT 12`
  );
  const stats = await query(
    `SELECT COUNT(*)::int AS count, COALESCE(ROUND(AVG(rating),1),0) AS avg
     FROM reviews WHERE is_visible = true`
  );
  res.json({ reviews: rows, stats: stats.rows[0] });
});

// Buradan sonrakılar girişlidir
router.use(authRequired);

// ---------- Öz rəyim ----------
router.get('/me', async (req: AuthedRequest, res) => {
  const { rows } = await query(
    'SELECT rating, comment FROM reviews WHERE user_id = $1',
    [req.user!.sub]
  );
  res.json({ review: rows[0] || null });
});

// ---------- Rəy göndər / yenilə (hər istifadəçidən bir rəy) ----------
router.post('/', async (req: AuthedRequest, res) => {
  const schema = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Reytinq 1–5 olmalıdır.' });

  const { rating, comment } = parsed.data;
  await query(
    `INSERT INTO reviews (user_id, rating, comment)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id)
     DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = now()`,
    [req.user!.sub, rating, comment?.trim() || null]
  );
  res.json({ message: 'Rəyiniz üçün təşəkkürlər!' });
});

export default router;

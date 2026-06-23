import { Router } from 'express';
import { query } from '../db/pool';
import { authRequired, AuthedRequest } from '../middleware/auth';

const router = Router();
router.use(authRequired);

router.get('/', async (req: AuthedRequest, res) => {
  const { rows } = await query(
    'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30',
    [req.user!.sub]
  );
  res.json({ notifications: rows });
});

router.patch('/:id/read', async (req: AuthedRequest, res) => {
  await query('UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2', [
    req.params.id,
    req.user!.sub,
  ]);
  res.json({ ok: true });
});

router.patch('/read-all', async (req: AuthedRequest, res) => {
  await query('UPDATE notifications SET is_read=true WHERE user_id=$1', [req.user!.sub]);
  res.json({ ok: true });
});

export default router;

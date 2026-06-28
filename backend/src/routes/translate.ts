import { Router } from 'express';
import { authRequired } from '../middleware/auth';
import { translateMany } from '../utils/translate';

const router = Router();
router.use(authRequired);

const ALLOWED = ['az', 'tr', 'en', 'ru'];

// ---------- Mətnləri tərcümə et ----------
router.post('/', async (req, res) => {
  const target = ALLOWED.includes(req.body.target) ? req.body.target : 'az';
  const texts: string[] = Array.isArray(req.body.texts)
    ? req.body.texts.slice(0, 80).map((t: any) => String(t ?? ''))
    : [];
  if (!texts.length) return res.json({ translations: [] });
  try {
    const translations = await translateMany(texts, target);
    res.json({ translations });
  } catch {
    res.status(502).json({ error: 'Tərcümə xidməti əlçatan deyil.' });
  }
});

export default router;

import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { query } from '../db/pool';

export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

// "Son aktivlik" yazısını məhdudlaşdır — hər istifadəçi üçün ən çox 30 saniyədən bir yaz
const lastWrite = new Map<string, number>();
function touchLastSeen(userId: string) {
  const now = Date.now();
  if (now - (lastWrite.get(userId) || 0) < 30_000) return;
  lastWrite.set(userId, now);
  query('UPDATE users SET last_seen = now() WHERE id = $1', [userId]).catch(() => {});
}

// is_active vəziyyətini yaddaşda keşlə (15 san) — hər sorğuda DB sorğusu olmasın,
// amma admin bloklayanda 15 saniyəyə (və ya dərhal — invalidateUser ilə) təsir etsin.
const activeCache = new Map<string, { active: boolean; ts: number }>();

/** Admin bloklayanda/silәndə dərhal qüvvəyə minsin deyə keşi təmizlə. */
export function invalidateUser(userId: string) {
  activeCache.delete(userId);
}

async function isActive(userId: string): Promise<boolean> {
  const c = activeCache.get(userId);
  if (c && Date.now() - c.ts < 15_000) return c.active;
  try {
    const r = await query('SELECT is_active FROM users WHERE id = $1', [userId]);
    const active = r.rows[0]?.is_active ?? false;
    activeCache.set(userId, { active, ts: Date.now() });
    return active;
  } catch {
    return true; // DB problemi olarsa istifadəçini bloklama
  }
}

export async function authRequired(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Avtorizasiya tələb olunur.' });
  }
  try {
    req.user = verifyToken(header.slice(7));
  } catch {
    return res.status(401).json({ error: 'Token etibarsızdır və ya vaxtı keçib.' });
  }
  // Deaktiv/silinmiş istifadəçinin girişini DƏRHAL kəs
  if (!(await isActive(req.user.sub))) {
    return res.status(403).json({
      error: 'Hesabınıza giriş dayandırılıb. Yenidən qeydiyyatdan keçin və ya admin ilə əlaqə saxlayın.',
      code: 'ACCOUNT_DISABLED',
    });
  }
  touchLastSeen(req.user.sub);
  next();
}

export function adminOnly(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Yalnız admin üçün.' });
  }
  next();
}

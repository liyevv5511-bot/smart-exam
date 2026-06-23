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
  // bloklamadan (fire-and-forget) yenilə
  query('UPDATE users SET last_seen = now() WHERE id = $1', [userId]).catch(() => {});
}

export function authRequired(
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
    touchLastSeen(req.user.sub);
    next();
  } catch {
    return res.status(401).json({ error: 'Token etibarsızdır və ya vaxtı keçib.' });
  }
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

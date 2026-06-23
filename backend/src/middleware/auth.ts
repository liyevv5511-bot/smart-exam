import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';

export interface AuthedRequest extends Request {
  user?: JwtPayload;
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

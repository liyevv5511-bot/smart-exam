import jwt, { SignOptions } from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

export interface JwtPayload {
  sub: string;          // user id
  role: 'student' | 'admin';
  email: string;
}

export function signToken(payload: JwtPayload, remember = false): string {
  const expiresIn = remember
    ? process.env.JWT_REMEMBER_EXPIRES_IN || '30d'
    : process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, SECRET, { expiresIn } as SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}

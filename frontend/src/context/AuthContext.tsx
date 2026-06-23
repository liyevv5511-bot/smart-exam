import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { api } from '../api/client';
import type { User } from '../types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User, remember: boolean) => void;
  logout: () => void;
  setUser: (u: User) => void;
}

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token =
      localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (token: string, u: User, remember: boolean) => {
    // Hər iki yaddaşı təmizlə → yalnız BİR aktiv token qalsın (sessiya qarışması olmasın)
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    (remember ? localStorage : sessionStorage).setItem('token', token);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </Ctx.Provider>
  );
}

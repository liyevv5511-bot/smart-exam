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

const cacheUser = (u: User | null) => {
  if (u) localStorage.setItem('authUser', JSON.stringify(u));
  else localStorage.removeItem('authUser');
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token =
      localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    // OFFLINE üçün: keşlənmiş istifadəçini dərhal bərpa et
    const cached = localStorage.getItem('authUser');
    if (cached) {
      try {
        setUserState(JSON.parse(cached));
      } catch {}
    }
    api
      .get('/auth/me')
      .then((r) => {
        setUserState(r.data.user);
        cacheUser(r.data.user);
      })
      .catch((err) => {
        // Yalnız token həqiqətən etibarsızdırsa (401) çıxış et.
        // Offline / şəbəkə xətasında keşlənmiş istifadəçi qalır.
        if (err?.response?.status === 401) {
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          cacheUser(null);
          setUserState(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (token: string, u: User, remember: boolean) => {
    // Hər iki yaddaşı təmizlə → yalnız BİR aktiv token qalsın (sessiya qarışması olmasın)
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    (remember ? localStorage : sessionStorage).setItem('token', token);
    cacheUser(u);
    setUserState(u);
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    cacheUser(null);
    setUserState(null);
  };

  const setUser = (u: User) => {
    cacheUser(u);
    setUserState(u);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </Ctx.Provider>
  );
}

import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

/**
 * Yalnız daxil OLMAMIŞ istifadəçilər üçün (giriş, qeydiyyat, şifrə bərpası).
 * Artıq daxil olunubsa, İdarəetmə Panelinə yönləndirir — beləcə mövcud
 * sessiya təsadüfən yeni qeydiyyatla əvəz olunmur.
 */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

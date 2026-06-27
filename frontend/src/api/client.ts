import axios from 'axios';

// İstehsalda (Vercel) backend ayrı ünvandadır → VITE_API_URL ilə təyin olunur.
// Lokalda boşdur → Vite proxy "/api"-ni backend-ə yönləndirir.
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
});

// Hər sorğuya token əlavə et
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function clearAuth() {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  localStorage.removeItem('authUser');
}

// 401 (vaxtı keçmiş token) və 403 ACCOUNT_DISABLED (silinmiş/bloklanmış hesab) → çıxış
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err.response?.status;
    const code = err.response?.data?.code;
    if (status === 403 && code === 'ACCOUNT_DISABLED') {
      // Hesab silinib/deaktiv edilib → dərhal çıxış və login səhifəsinə yönləndir
      clearAuth();
      if (!location.pathname.startsWith('/login')) {
        location.href = '/login?disabled=1';
      }
    } else if (status === 401 && !location.pathname.startsWith('/login')) {
      clearAuth();
    }
    return Promise.reject(err);
  }
);

export const apiError = (e: any): string =>
  e?.response?.data?.error || e?.message || 'Naməlum xəta baş verdi.';

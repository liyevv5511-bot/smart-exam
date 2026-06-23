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

// 401 → çıxış
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !location.pathname.startsWith('/login')) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
    }
    return Promise.reject(err);
  }
);

export const apiError = (e: any): string =>
  e?.response?.data?.error || e?.message || 'Naməlum xəta baş verdi.';

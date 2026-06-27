import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { api, apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  // Hesabı silinmiş/deaktiv edilmiş istifadəçi yönləndirilibsə xəbər ver
  useEffect(() => {
    if (new URLSearchParams(location.search).get('disabled')) {
      toast.error('Hesabınıza giriş dayandırılıb. Yenidən qeydiyyatdan keçin.', { duration: 6000 });
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user, form.remember);
      toast.success('Xoş gəldiniz! 👋');
      navigate('/');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Daxil ol" subtitle="Hesabınıza daxil olun və davam edin.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">E-poçt</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input pl-9"
              placeholder="ad@nümunə.com"
            />
          </div>
        </div>
        <div>
          <label className="label">Şifrə</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type={show ? 'text' : 'password'}
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input px-9"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-3 text-slate-400"
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(e) => setForm({ ...form, remember: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            Məni yadda saxla
          </label>
          <Link to="/forgot-password" className="font-medium text-brand-600 hover:underline">
            Şifrəni unutdum?
          </Link>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Daxil olunur…' : 'Daxil ol'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Hesabınız yoxdur?{' '}
        <Link to="/register" className="font-semibold text-brand-600 hover:underline">
          Qeydiyyatdan keçin
        </Link>
      </p>
    </AuthShell>
  );
}

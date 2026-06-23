import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, KeyRound } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { api, apiError } from '../api/client';

export default function ForgotPassword() {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      // Demo: token cavabda gəlir; istehsalda e-poçtla göndərilir
      if (data.resetToken) {
        setToken(data.resetToken);
        toast.success('Bərpa kodu yaradıldı (demo).');
      } else {
        toast.success(data.message);
      }
      setStep('reset');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Şifrə yeniləndi! Daxil ola bilərsiniz.');
      setStep('request');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Şifrəni bərpa et"
      subtitle={
        step === 'request'
          ? 'E-poçtunuzu daxil edin, bərpa kodu göndərək.'
          : 'Bərpa kodu və yeni şifrəni daxil edin.'
      }
    >
      {step === 'request' ? (
        <form onSubmit={request} className="space-y-4">
          <div>
            <label className="label">E-poçt</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-9"
                placeholder="ad@nümunə.com"
              />
            </div>
          </div>
          <button disabled={loading} className="btn-primary w-full">
            {loading ? 'Göndərilir…' : 'Bərpa kodu göndər'}
          </button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-4">
          <div>
            <label className="label">Bərpa kodu</label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="input pl-9"
                placeholder="Bərpa kodu"
              />
            </div>
          </div>
          <div>
            <label className="label">Yeni şifrə</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="Yeni şifrə"
            />
          </div>
          <button disabled={loading} className="btn-primary w-full">
            {loading ? 'Yenilənir…' : 'Şifrəni yenilə'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Girişə qayıt
        </Link>
      </p>
    </AuthShell>
  );
}

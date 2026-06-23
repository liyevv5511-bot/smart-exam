import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Mail, Lock } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { api, apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword)
      return toast.error('Şifrələr uyğun gəlmir.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.token, data.user, true);
      toast.success('Hesab yaradıldı! 🎉');
      navigate('/');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const field = (
    key: keyof typeof form,
    label: string,
    type: string,
    Icon: any,
    ph: string
  ) => (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <Icon size={16} className="absolute left-3 top-3 text-slate-400" />
        <input
          type={type}
          required
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="input pl-9"
          placeholder={ph}
        />
      </div>
    </div>
  );

  return (
    <AuthShell title="Qeydiyyat" subtitle="Pulsuz hesab yaradın və başlayın.">
      <form onSubmit={submit} className="space-y-4">
        {field('fullName', 'Tam Ad', 'text', User, 'Ad Soyad')}
        {field('email', 'E-poçt', 'email', Mail, 'ad@nümunə.com')}
        {field('password', 'Şifrə', 'password', Lock, 'Ən azı 6 simvol')}
        {field('confirmPassword', 'Şifrəni Təsdiqlə', 'password', Lock, 'Şifrəni təkrarla')}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Yaradılır…' : 'Hesab yarat'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Artıq hesabınız var?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Daxil olun
        </Link>
      </p>
    </AuthShell>
  );
}

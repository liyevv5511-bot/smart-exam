import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  User,
  Lock,
  History,
  FileText,
  LifeBuoy,
  Phone,
  Mail,
  MessageCircle,
} from 'lucide-react';
import { api, apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

// ---- Admin əlaqə məlumatları (dəyişmək üçün buradan redaktə edin) ----
const ADMIN_PHONE = '060-288-88-40';
const ADMIN_PHONE_INTL = '994602888840'; // +994, baş sıfır atılmış (tel/WhatsApp üçün)
const ADMIN_EMAIL = 'liyevv5511@gmail.com';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [tab, setTab] = useState<'profile' | 'password' | 'history' | 'support'>('profile');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' });
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (tab === 'history') api.get('/profile/history').then((r) => setHistory(r.data.history));
  }, [tab]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/profile', { fullName });
      setUser(data.user);
      toast.success('Profil yeniləndi.');
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  const changePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/profile/password', pwd);
      setPwd({ currentPassword: '', newPassword: '' });
      toast.success('Şifrə dəyişdirildi.');
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  const tabs = [
    { id: 'profile' as const, icon: User, label: 'Profil' },
    { id: 'password' as const, icon: Lock, label: 'Şifrə' },
    { id: 'history' as const, icon: History, label: 'Tarixçə' },
    { id: 'support' as const, icon: LifeBuoy, label: 'Dəstək' },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-600 text-2xl font-bold text-white">
          {user?.full_name?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">{user?.full_name}</h1>
          <p className="text-sm text-slate-400">{user?.email}</p>
        </div>
      </div>

      <div className="flex gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-white text-brand-600 shadow-sm dark:bg-slate-900'
                : 'text-slate-500'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <form onSubmit={saveProfile} className="card space-y-4">
          <div>
            <label className="label">Tam Ad</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">E-poçt</label>
            <input value={user?.email} disabled className="input opacity-60" />
          </div>
          <button className="btn-primary">Yadda saxla</button>
        </form>
      )}

      {tab === 'password' && (
        <form onSubmit={changePwd} className="card space-y-4">
          <div>
            <label className="label">Cari şifrə</label>
            <input
              type="password"
              required
              value={pwd.currentPassword}
              onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Yeni şifrə</label>
            <input
              type="password"
              required
              minLength={6}
              value={pwd.newPassword}
              onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
              className="input"
            />
          </div>
          <button className="btn-primary">Şifrəni dəyiş</button>
        </form>
      )}

      {tab === 'history' && (
        <div className="card">
          {!history.length ? (
            <p className="py-8 text-center text-slate-400">Hələ imtahan tarixçəsi yoxdur.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 p-3 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-brand-500" />
                    <div>
                      <p className="text-sm font-medium">{h.test_title}</p>
                      <p className="text-xs text-slate-400">
                        {h.mode} · {new Date(h.submitted_at).toLocaleDateString('az')}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold">{h.score}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'support' && (
        <div className="space-y-4">
          <div className="card bg-gradient-to-br from-brand-600 to-brand-800 text-white">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15 backdrop-blur">
                <LifeBuoy size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Admin ilə əlaqə</h2>
                <p className="text-sm text-brand-100">
                  Sual, problem və ya təklifiniz varsa bizimlə əlaqə saxlayın.
                </p>
              </div>
            </div>
          </div>

          {/* Telefon */}
          <div className="card">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <Phone size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-400">Telefon</p>
                <p className="font-bold tracking-wide">{ADMIN_PHONE}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a href={`tel:+${ADMIN_PHONE_INTL}`} className="btn-ghost justify-center">
                <Phone size={16} /> Zəng et
              </a>
              <a
                href={`https://wa.me/${ADMIN_PHONE_INTL}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn justify-center bg-[#25D366] text-white hover:opacity-90"
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
            </div>
          </div>

          {/* E-poçt */}
          <div className="card">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                <Mail size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-400">E-poçt</p>
                <p className="truncate font-bold">{ADMIN_EMAIL}</p>
              </div>
            </div>
            <a
              href={`mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(
                'Ağıllı İmtahan — Dəstək'
              )}&body=${encodeURIComponent(
                `Salam,\n\nAd: ${user?.full_name || ''}\nE-poçt: ${user?.email || ''}\n\nMesajınız:\n`
              )}`}
              className="btn-primary w-full"
            >
              <Mail size={16} /> Mesaj yaz
            </a>
          </div>

          <p className="text-center text-xs text-slate-400">
            İş saatları: hər gün 09:00 – 21:00
          </p>
        </div>
      )}
    </div>
  );
}

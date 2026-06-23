import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { User, Lock, History, FileText } from 'lucide-react';
import { api, apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [tab, setTab] = useState<'profile' | 'password' | 'history'>('profile');
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
    </div>
  );
}

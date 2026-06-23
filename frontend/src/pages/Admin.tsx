import { useEffect, useState, Fragment } from 'react';
import toast from 'react-hot-toast';
import {
  Users,
  FileText,
  Trash2,
  Ban,
  CheckCircle2,
  BookOpen,
  ClipboardList,
  Trophy,
  ChevronDown,
  Mail,
  Calendar,
  FileSpreadsheet,
  Edit3,
} from 'lucide-react';
import { api, apiError } from '../api/client';
import { StatCard } from '../components/StatCard';

export default function Admin() {
  const [tab, setTab] = useState<'users' | 'tests'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [userTests, setUserTests] = useState<Record<string, any[]>>({});
  const [live, setLive] = useState<{ onlineCount: number; inExamCount: number; total: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadUsers = () =>
    api.get('/admin/users').then((r) => {
      setUsers(r.data.users);
      setLive(r.data.live);
      setLastUpdate(new Date());
    });

  const load = () => {
    loadUsers();
    api.get('/admin/tests').then((r) => setTests(r.data.tests));
    api.get('/admin/stats').then((r) => setStats(r.data));
  };

  useEffect(() => {
    load();
    // CANLI: hər 8 saniyədə istifadəçi siyahısını avtomatik yenilə
    const t = setInterval(loadUsers, 8000);
    return () => clearInterval(t);
  }, []);

  const toggleActive = async (u: any) => {
    try {
      await api.patch(`/admin/users/${u.id}/active`, { isActive: !u.is_active });
      setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, is_active: !x.is_active } : x)));
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const toggleExpand = async (id: string) => {
    if (expanded === id) return setExpanded(null);
    setExpanded(id);
    if (!userTests[id]) {
      try {
        const { data } = await api.get(`/admin/users/${id}/tests`);
        setUserTests((m) => ({ ...m, [id]: data.tests }));
      } catch (e) {
        toast.error(apiError(e));
      }
    }
  };

  const delUser = async (id: string) => {
    if (!confirm('İstifadəçi və bütün məlumatları silinsin?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers((us) => us.filter((x) => x.id !== id));
      toast.success('İstifadəçi silindi.');
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const delTest = async (id: string) => {
    if (!confirm('Test silinsin?')) return;
    try {
      await api.delete(`/admin/tests/${id}`);
      setTests((t) => t.filter((x) => x.id !== id));
      toast.success('Test silindi.');
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const t = stats?.totals;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Admin Paneli</h1>
        <p className="text-sm text-slate-500">İstifadəçiləri və testləri idarə edin.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Tələbələr" value={t?.students ?? '—'} accent="bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300" />
        <StatCard icon={BookOpen} label="Testlər" value={t?.tests ?? '—'} accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" />
        <StatCard icon={ClipboardList} label="İmtahanlar" value={t?.exams_taken ?? '—'} accent="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" />
        <StatCard icon={Trophy} label="Orta bal" value={t?.avg_score ?? '—'} suffix="%" accent="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" />
      </div>

      {/* CANLI status zolağı */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          Canlı
        </span>
        <span className="flex items-center gap-1.5 text-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <b>{live?.onlineCount ?? 0}</b> nəfər onlayn
        </span>
        <span className="flex items-center gap-1.5 text-sm">
          <Edit3 size={14} className="text-brand-500" />
          <b>{live?.inExamCount ?? 0}</b> nəfər imtahan yazır
        </span>
        <span className="flex items-center gap-1.5 text-sm text-slate-400">
          <Users size={14} /> {live?.total ?? 0} tələbə
        </span>
        {lastUpdate && (
          <span className="ml-auto text-xs text-slate-400">
            Yeniləndi: {lastUpdate.toLocaleTimeString('az')}
          </span>
        )}
      </div>

      <div className="flex gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button
          onClick={() => setTab('users')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium ${
            tab === 'users' ? 'bg-white text-brand-600 shadow-sm dark:bg-slate-900' : 'text-slate-500'
          }`}
        >
          <Users size={16} /> İstifadəçilər
        </button>
        <button
          onClick={() => setTab('tests')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium ${
            tab === 'tests' ? 'bg-white text-brand-600 shadow-sm dark:bg-slate-900' : 'text-slate-500'
          }`}
        >
          <FileText size={16} /> Testlər
        </button>
      </div>

      {tab === 'users' ? (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-400 dark:border-slate-800">
                <th className="pb-2 font-medium">Ad</th>
                <th className="pb-2 font-medium">Qeydiyyat e-poçtu</th>
                <th className="pb-2 font-medium">Qeydiyyat tarixi</th>
                <th className="pb-2 font-medium">Rol</th>
                <th className="pb-2 font-medium">Yüklədiyi testlər</th>
                <th className="pb-2 font-medium">İmtahanlar</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <Fragment key={u.id}>
                  <tr
                    onClick={() => toggleExpand(u.id)}
                    className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          size={14}
                          className={`text-slate-400 transition ${expanded === u.id ? 'rotate-180' : ''}`}
                        />
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                            u.online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                          title={u.online ? 'Onlayn' : 'Oflayn'}
                        />
                        {u.full_name}
                      </div>
                    </td>
                    <td className="py-3 text-slate-500">{u.email}</td>
                    <td className="py-3 text-slate-400">
                      {new Date(u.created_at).toLocaleDateString('az')}
                    </td>
                    <td className="py-3">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-brand-600">
                        <FileSpreadsheet size={14} /> {u.tests_uploaded}
                      </span>
                    </td>
                    <td className="py-3">{u.exams_taken}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {u.in_exam && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                            <Edit3 size={11} /> İmtahanda
                          </span>
                        )}
                        {!u.is_active ? (
                          <span className="text-xs font-medium text-rose-500">Bloklanıb</span>
                        ) : u.online ? (
                          <span className="text-xs font-medium text-emerald-600">Onlayn</span>
                        ) : (
                          <span className="text-xs text-slate-400">Oflayn</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => toggleActive(u)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title={u.is_active ? 'Blokla' : 'Aktiv et'}>
                          {u.is_active ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                        </button>
                        <button onClick={() => delUser(u.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40" title="Sil">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Açılan detal — qeydiyyat məlumatı + yüklədiyi testlər */}
                  {expanded === u.id && (
                    <tr className="bg-slate-50 dark:bg-slate-800/30">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail size={16} className="text-brand-500" />
                            <div>
                              <p className="text-xs text-slate-400">Qeydiyyat e-poçtu</p>
                              <p className="font-medium">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Users size={16} className="text-brand-500" />
                            <div>
                              <p className="text-xs text-slate-400">Tam ad</p>
                              <p className="font-medium">{u.full_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar size={16} className="text-brand-500" />
                            <div>
                              <p className="text-xs text-slate-400">Qeydiyyat tarixi</p>
                              <p className="font-medium">
                                {new Date(u.created_at).toLocaleString('az')}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="mb-2 text-sm font-semibold text-slate-500">
                            Yüklədiyi testlər ({u.tests_uploaded})
                          </p>
                          {!userTests[u.id] ? (
                            <p className="text-sm text-slate-400">Yüklənir…</p>
                          ) : userTests[u.id].length === 0 ? (
                            <p className="text-sm text-slate-400">Heç bir test yükləməyib.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {userTests[u.id].map((t) => (
                                <div
                                  key={t.id}
                                  className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                                >
                                  <FileSpreadsheet size={15} className="text-emerald-500" />
                                  <span className="font-medium">{t.title}</span>
                                  <span className="text-slate-400">· {t.question_count} sual</span>
                                  {t.source_file && (
                                    <span className="text-xs text-slate-400">· {t.source_file}</span>
                                  )}
                                  <span className="ml-auto text-xs text-slate-400">
                                    {new Date(t.created_at).toLocaleDateString('az')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-400 dark:border-slate-800">
                <th className="pb-2 font-medium">Başlıq</th>
                <th className="pb-2 font-medium">Sahib</th>
                <th className="pb-2 font-medium">Suallar</th>
                <th className="pb-2 font-medium">Tarix</th>
                <th className="pb-2 font-medium">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                  <td className="py-3 font-medium">{t.title}</td>
                  <td className="py-3 text-slate-500">{t.owner_name}</td>
                  <td className="py-3">{t.question_count}</td>
                  <td className="py-3 text-slate-400">{new Date(t.created_at).toLocaleDateString('az')}</td>
                  <td className="py-3">
                    <button onClick={() => delTest(t.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

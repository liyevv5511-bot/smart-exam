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
  Shield,
  Eye,
  X,
  Megaphone,
  Send,
} from 'lucide-react';
import { api, apiError } from '../api/client';
import { StatCard } from '../components/StatCard';

export default function Admin() {
  const [tab, setTab] = useState<'activity' | 'users' | 'tests'>('activity');
  const [users, setUsers] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [live, setLive] = useState<{ onlineCount: number; inExamCount: number; total: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [viewTest, setViewTest] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [student, setStudent] = useState<any>(null);

  const openStudent = async (id: string) => {
    setStudent({ loading: true });
    try {
      const { data } = await api.get(`/admin/users/${id}/detail`);
      setStudent(data);
    } catch (e) {
      toast.error(apiError(e));
      setStudent(null);
    }
  };
  const [bcTitle, setBcTitle] = useState('');
  const [bcBody, setBcBody] = useState('');
  const [sending, setSending] = useState(false);

  const broadcast = async () => {
    if (!bcTitle.trim()) return toast.error('Başlıq yazın.');
    setSending(true);
    try {
      const { data } = await api.post('/admin/broadcast', { title: bcTitle, body: bcBody });
      toast.success(`${data.sent} istifadəçiyə bildiriş göndərildi.`);
      setBcTitle('');
      setBcBody('');
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSending(false);
    }
  };

  const fillNewsTemplate = () => {
    setBcTitle('🎉 Yeni xüsusiyyətlər!');
    setBcBody(
      'İndi testləri OFFLINE (internetsiz) həll edə bilərsiniz — testi "Offline endir" edin, internet olmadan yazın, nəticələr internet qayıdanda avtomatik sinxronlaşır. Həmçinin imtahanda sual aralığı seçib (məs. 1-200) həmin aralıqdan istədiyiniz qədər (məs. 50) təsadüfi sual qarışdıra bilərsiniz!'
    );
  };

  const openTest = async (id: string) => {
    setViewLoading(true);
    setViewTest({ loading: true });
    try {
      const { data } = await api.get(`/admin/tests/${id}`);
      setViewTest(data);
    } catch (e) {
      toast.error(apiError(e));
      setViewTest(null);
    } finally {
      setViewLoading(false);
    }
  };

  const loadLive = () => {
    api.get('/admin/users').then((r) => {
      setUsers(r.data.users);
      setLive(r.data.live);
      setLastUpdate(new Date());
    });
    api.get('/admin/activity').then((r) => setActivity(r.data.active));
  };

  const load = () => {
    loadLive();
    api.get('/admin/tests').then((r) => setTests(r.data.tests));
    api.get('/admin/stats').then((r) => setStats(r.data));
  };

  useEffect(() => {
    load();
    // CANLI: hər 6 saniyədə istifadəçi siyahısı + fəaliyyəti avtomatik yenilə
    const t = setInterval(loadLive, 6000);
    return () => clearInterval(t);
  }, []);

  const changeRole = async (u: any) => {
    const newRole = u.role === 'admin' ? 'student' : 'admin';
    if (!confirm(`${u.full_name} → "${newRole}" roluna keçirilsin?`)) return;
    try {
      await api.patch(`/admin/users/${u.id}/role`, { role: newRole });
      setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)));
      toast.success('Rol dəyişdirildi.');
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const toggleActive = async (u: any) => {
    try {
      await api.patch(`/admin/users/${u.id}/active`, { isActive: !u.is_active });
      setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, is_active: !x.is_active } : x)));
    } catch (e) {
      toast.error(apiError(e));
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

      {/* Bildiriş göndər (bütün istifadəçilərə) */}
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold">
            <Megaphone size={18} className="text-brand-600" /> Bütün istifadəçilərə bildiriş
          </h3>
          <button onClick={fillNewsTemplate} className="text-xs font-medium text-brand-600 hover:underline">
            Yenilik şablonu
          </button>
        </div>
        <div className="space-y-2">
          <input
            value={bcTitle}
            onChange={(e) => setBcTitle(e.target.value)}
            className="input"
            placeholder="Başlıq (məs. 🎉 Yeni xüsusiyyətlər!)"
          />
          <textarea
            value={bcBody}
            onChange={(e) => setBcBody(e.target.value)}
            className="input min-h-[80px]"
            placeholder="Mətn…"
          />
          <button onClick={broadcast} disabled={sending} className="btn-primary">
            <Send size={16} /> {sending ? 'Göndərilir…' : 'Hamıya göndər'}
          </button>
        </div>
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
          onClick={() => setTab('activity')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium ${
            tab === 'activity' ? 'bg-white text-brand-600 shadow-sm dark:bg-slate-900' : 'text-slate-500'
          }`}
        >
          <Edit3 size={16} /> Canlı Fəaliyyət
          {activity.length > 0 && (
            <span className="rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">
              {activity.length}
            </span>
          )}
        </button>
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

      {/* CANLI FƏALİYYƏT — kim hansı imtahanı yazır, irəliləyişlə */}
      {tab === 'activity' && (
        <div className="space-y-3">
          {activity.length === 0 ? (
            <div className="card py-16 text-center text-slate-400">
              <Edit3 size={40} className="mx-auto mb-3 opacity-40" />
              Hazırda heç kim imtahan yazmır.
              <p className="mt-1 text-xs">Bu siyahı avtomatik yenilənir.</p>
            </div>
          ) : (
            activity.map((a) => {
              const pct = a.total ? Math.round((Number(a.answered) / a.total) * 100) : 0;
              const mins = Math.floor((Date.now() - new Date(a.started_at).getTime()) / 60000);
              return (
                <div key={a.session_id} className="card">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                        {a.full_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{a.full_name}</p>
                        <p className="text-xs text-slate-400">{a.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{a.test_title}</p>
                      <p className="text-xs text-slate-400">
                        {a.practice ? 'Məşq' : a.mode} · {mins} dəq əvvəl başladı
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-slate-400">
                      <span>İrəliləyiş</span>
                      <span>
                        {a.answered}/{a.total} cavablandı ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'users' && (
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
                    onClick={() => openStudent(u.id)}
                    className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <Eye size={14} className="text-slate-400" />
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
                        <button onClick={() => changeRole(u)} className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40" title={u.role === 'admin' ? 'Tələbə et' : 'Admin et'}>
                          <Shield size={16} />
                        </button>
                        <button onClick={() => toggleActive(u)} className={`rounded-lg p-1.5 ${u.is_active ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'}`} title={u.is_active ? 'Girişi deaktiv et (blokla)' : 'Aktiv et'}>
                          {u.is_active ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                        </button>
                        <button onClick={() => delUser(u.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40" title="Sil">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'tests' && (
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
                  <td className="py-3 text-slate-500">
                    <div>{t.owner_name}</div>
                    <div className="text-xs text-slate-400">{t.owner_email}</div>
                  </td>
                  <td className="py-3">{t.question_count}</td>
                  <td className="py-3 text-slate-400">{new Date(t.created_at).toLocaleDateString('az')}</td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openTest(t.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950/40" title="Məzmuna bax">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => delTest(t.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40" title="Sil">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Test məzmunu — istənilən yüklənmiş faylın sualları */}
      {viewTest && (
        <div
          onClick={() => setViewTest(null)}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 dark:bg-slate-900"
          >
            {viewLoading || viewTest.loading ? (
              <p className="py-8 text-center text-slate-400">Yüklənir…</p>
            ) : (
              <>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold">{viewTest.test.title}</h3>
                    <p className="text-sm text-slate-400">
                      {viewTest.test.owner_name} ({viewTest.test.owner_email}) ·{' '}
                      {viewTest.test.question_count} sual
                      {viewTest.test.source_file && ` · ${viewTest.test.source_file}`}
                    </p>
                  </div>
                  <button onClick={() => setViewTest(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X size={18} />
                  </button>
                </div>
                <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                  {viewTest.questions.map((q: any) => (
                    <div key={q.position} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <p className="mb-2 font-medium">
                        {q.position}. {q.text}
                        {q.topic && (
                          <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800">
                            {q.topic}
                          </span>
                        )}
                      </p>
                      <div className="space-y-1 text-sm">
                        {q.options.map((o: string, i: number) => (
                          <p
                            key={i}
                            className={
                              i === q.correct_index
                                ? 'font-semibold text-emerald-600'
                                : 'text-slate-500'
                            }
                          >
                            {String.fromCharCode(65 + i)}) {o}
                            {i === q.correct_index && ' ✓'}
                          </p>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
                          💡 {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TƏLƏBƏ DETALLARI — statistika + bütün imtahanlar + son nəticə */}
      {student && (
        <div
          onClick={() => setStudent(null)}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 dark:bg-slate-900"
          >
            {student.loading ? (
              <p className="py-10 text-center text-slate-400">Yüklənir…</p>
            ) : (
              <>
                {/* Başlıq */}
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-xl font-bold text-white">
                      {student.user.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold">{student.user.full_name}</h3>
                      <p className="text-sm text-slate-400">{student.user.email}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-md px-2 py-0.5 font-semibold ${student.user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}>
                          {student.user.role}
                        </span>
                        <span className={student.user.is_active ? 'text-emerald-600' : 'text-rose-500'}>
                          {student.user.is_active ? 'Aktiv' : 'Bloklanıb'}
                        </span>
                        <span className="text-slate-400">
                          · Qeydiyyat: {new Date(student.user.created_at).toLocaleDateString('az')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setStudent(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X size={18} />
                  </button>
                </div>

                {/* Statistika kartları */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[
                    { label: 'İmtahan', value: student.stats.exams_taken },
                    { label: 'Orta bal', value: student.stats.avg_score + '%' },
                    { label: 'Ən yüksək', value: student.stats.best_score + '%' },
                    { label: 'Uğur', value: student.stats.success_rate + '%' },
                    { label: 'Yüklədiyi test', value: student.stats.tests_uploaded },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-slate-200 p-3 text-center dark:border-slate-700">
                      <p className="text-lg font-extrabold">{s.value}</p>
                      <p className="text-xs text-slate-400">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Son nəticə */}
                {student.latest && (
                  <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900/50 dark:bg-brand-950/30">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                      Son nəticə
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold">{student.latest.test_title}</p>
                        <p className="text-sm text-slate-500">
                          {student.latest.practice ? 'Məşq' : student.latest.mode} ·{' '}
                          {new Date(student.latest.submitted_at).toLocaleString('az')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-extrabold">{student.latest.score}%</p>
                        <p className={`text-sm font-bold ${gradeColor(student.latest.grade)}`}>
                          {student.latest.grade} · {student.latest.correct_count}/{student.latest.total} düz
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bütün imtahanlar */}
                <div className="mt-5">
                  <p className="mb-2 font-bold">Bütün imtahanlar ({student.exams.length})</p>
                  {student.exams.length === 0 ? (
                    <p className="text-sm text-slate-400">Hələ imtahan yazmayıb.</p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                          <tr className="text-left text-slate-400">
                            <th className="px-3 py-2 font-medium">Test</th>
                            <th className="px-3 py-2 font-medium">Rejim</th>
                            <th className="px-3 py-2 font-medium">Düz/Səhv</th>
                            <th className="px-3 py-2 font-medium">Bal</th>
                            <th className="px-3 py-2 font-medium">Qiymət</th>
                            <th className="px-3 py-2 font-medium">Tarix</th>
                          </tr>
                        </thead>
                        <tbody>
                          {student.exams.map((e: any, i: number) => (
                            <tr key={e.id} className={`border-t border-slate-100 dark:border-slate-800/60 ${i === 0 ? 'bg-brand-50/40 dark:bg-brand-950/20' : ''}`}>
                              <td className="px-3 py-2 font-medium">{e.test_title}</td>
                              <td className="px-3 py-2 text-slate-500">{e.practice ? 'məşq' : e.mode}</td>
                              <td className="px-3 py-2">
                                <span className="text-emerald-600">{e.correct_count}</span> /{' '}
                                <span className="text-rose-500">{e.wrong_count}</span>
                              </td>
                              <td className="px-3 py-2 font-semibold">{e.score}%</td>
                              <td className={`px-3 py-2 font-bold ${gradeColor(e.grade)}`}>{e.grade}</td>
                              <td className="px-3 py-2 text-slate-400">{new Date(e.submitted_at).toLocaleDateString('az')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Yüklədiyi testlər */}
                {student.uploadedTests.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 font-bold">Yüklədiyi testlər ({student.uploadedTests.length})</p>
                    <div className="space-y-1.5">
                      {student.uploadedTests.map((t: any) => (
                        <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                          <FileSpreadsheet size={15} className="text-emerald-500" />
                          <span className="font-medium">{t.title}</span>
                          <span className="text-slate-400">· {t.question_count} sual</span>
                          <span className="ml-auto text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString('az')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const gradeColor = (g: string) =>
  ({ A: 'text-emerald-600', B: 'text-brand-600', C: 'text-amber-600', D: 'text-orange-600', F: 'text-rose-600' } as any)[g] ||
  'text-slate-600';

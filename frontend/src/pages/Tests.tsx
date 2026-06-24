import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Trash2,
  Play,
  Upload,
  Search,
  FileText,
  Pencil,
  DownloadCloud,
  CheckCircle2,
  WifiOff,
} from 'lucide-react';
import { api, apiError } from '../api/client';
import type { Test } from '../types';
import {
  saveOfflineTest,
  listOfflineTestIds,
  removeOfflineTest,
  getOfflineTest,
} from '../offline/db';
import { useOffline } from '../offline/OfflineContext';

export default function Tests() {
  const { online } = useOffline();
  const [tests, setTests] = useState<Test[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = () =>
    api
      .get('/tests')
      .then((r) => setTests(r.data.tests))
      .catch(async () => {
        // OFFLINE: server cavab vermir → endirilmiş testləri göstər
        const ids = await listOfflineTestIds();
        const offline: any[] = [];
        for (const id of ids) {
          const o = await getOfflineTest(id);
          if (o) offline.push({ ...o.test, created_at: o.downloadedAt });
        }
        setTests(offline);
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    listOfflineTestIds().then((ids) => setDownloaded(new Set(ids)));
  }, []);

  // Testi offline üçün endir (suallar + düzgün cavablar cihazda saxlanılır)
  const download = async (id: string) => {
    setDownloading(id);
    try {
      const { data } = await api.get(`/tests/${id}`);
      await saveOfflineTest({
        test: {
          id: data.test.id,
          title: data.test.title,
          question_count: data.test.question_count,
        },
        questions: data.questions,
        downloadedAt: new Date().toISOString(),
      });
      setDownloaded((s) => new Set(s).add(id));
      toast.success('Test offline endirildi! İnternetsiz həll edə bilərsiniz.');
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setDownloading(null);
    }
  };

  const removeDownload = async (id: string) => {
    await removeOfflineTest(id);
    setDownloaded((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    toast.success('Offline nüsxə silindi.');
  };

  const del = async (id: string) => {
    if (!confirm('Bu test silinsin? Bütün nəticələr də silinəcək.')) return;
    try {
      await api.delete(`/tests/${id}`);
      setTests((t) => t.filter((x) => x.id !== id));
      toast.success('Test silindi.');
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const filtered = tests.filter((t) =>
    t.title.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Testlərim</h1>
          <p className="text-sm text-slate-500">Yüklədiyiniz sual bankları.</p>
        </div>
        <Link to="/upload" className="btn-primary">
          <Upload size={18} /> Yeni yüklə
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input pl-9"
          placeholder="Test axtar…"
        />
      </div>

      {loading ? (
        <p className="text-slate-400">Yüklənir…</p>
      ) : !filtered.length ? (
        <div className="card py-16 text-center text-slate-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
          Test tapılmadı.{' '}
          <Link to="/upload" className="font-medium text-brand-600 hover:underline">
            İlk testinizi yükləyin
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card flex flex-col"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                  <FileText size={20} />
                </div>
                <button
                  onClick={() => del(t.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold">{t.title}</h3>
                {downloaded.has(t.id) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <CheckCircle2 size={10} /> Offline
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {t.question_count} sual ·{' '}
                {new Date(t.created_at).toLocaleDateString('az')}
              </p>
              <div className="mt-4 flex gap-2">
                {!online && downloaded.has(t.id) ? (
                  // Offline + endirilib → offline imtahan
                  <Link
                    to={`/offline-exam/${t.id}`}
                    state={{ config: { mode: 'full' } }}
                    className="btn-primary flex-1"
                  >
                    <WifiOff size={16} /> Offline başla
                  </Link>
                ) : (
                  <Link
                    to={`/tests/${t.id}/config`}
                    className={`btn-primary flex-1 ${!online ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    <Play size={16} /> Başla
                  </Link>
                )}
                <Link to={`/tests/${t.id}/edit`} className="btn-ghost" title="Redaktə et">
                  <Pencil size={16} />
                </Link>
              </div>
              {/* Offline endirmə */}
              <div className="mt-2">
                {downloaded.has(t.id) ? (
                  <button
                    onClick={() => removeDownload(t.id)}
                    className="text-xs text-slate-400 hover:text-rose-500"
                  >
                    Offline nüsxəni sil
                  </button>
                ) : (
                  <button
                    onClick={() => download(t.id)}
                    disabled={downloading === t.id || !online}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline disabled:opacity-50"
                  >
                    <DownloadCloud size={13} />
                    {downloading === t.id ? 'Endirilir…' : 'Offline endir'}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

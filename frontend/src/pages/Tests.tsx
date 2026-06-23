import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { BookOpen, Trash2, Play, Upload, Search, FileText, Pencil } from 'lucide-react';
import { api, apiError } from '../api/client';
import type { Test } from '../types';

export default function Tests() {
  const [tests, setTests] = useState<Test[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () =>
    api
      .get('/tests')
      .then((r) => setTests(r.data.tests))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

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
              <h3 className="font-bold">{t.title}</h3>
              <p className="mt-1 text-sm text-slate-400">
                {t.question_count} sual ·{' '}
                {new Date(t.created_at).toLocaleDateString('az')}
              </p>
              <div className="mt-4 flex gap-2">
                <Link to={`/tests/${t.id}/config`} className="btn-primary flex-1">
                  <Play size={16} /> Başla
                </Link>
                <Link to={`/tests/${t.id}/edit`} className="btn-ghost" title="Redaktə et">
                  <Pencil size={16} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

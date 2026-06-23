import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BookUp,
  ClipboardCheck,
  Gauge,
  Target,
  Upload,
  ArrowRight,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { api, apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/StatCard';

interface Dash {
  summary: {
    tests_uploaded: number;
    exams_taken: number;
    avg_score: number;
    success_rate: number;
  };
  recentActivity: any[];
}

const gradeColor = (g: string) =>
  ({ A: 'text-emerald-600', B: 'text-brand-600', C: 'text-amber-600', D: 'text-orange-600', F: 'text-rose-600' }[g] ||
  'text-slate-600');

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Dash | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    api.get('/stats/dashboard').then((r) => setData(r.data));
    api.get('/exams/mistakes/summary').then((r) => setMistakes(r.data.total)).catch(() => {});
  }, []);

  const practiceMistakes = async () => {
    setStarting(true);
    try {
      const { data } = await api.post('/exams/mistakes/start', { practice: true });
      navigate(`/exam/${data.session.id}`, { state: data });
    } catch (e) {
      toast.error(apiError(e));
      setStarting(false);
    }
  };

  const s = data?.summary;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">
            Salam, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-slate-500">
            İrəliləyişinizə baxın və yeni imtahana başlayın.
          </p>
        </div>
        <Link to="/upload" className="btn-primary">
          <Upload size={18} /> Excel Yüklə
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookUp}
          label="Yüklənmiş testlər"
          value={s?.tests_uploaded ?? '—'}
          accent="bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
          delay={0}
        />
        <StatCard
          icon={ClipboardCheck}
          label="Həll olunmuş imtahanlar"
          value={s?.exams_taken ?? '—'}
          accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          delay={0.05}
        />
        <StatCard
          icon={Gauge}
          label="Orta bal"
          value={s?.avg_score ?? '—'}
          suffix="%"
          accent="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
          delay={0.1}
        />
        <StatCard
          icon={Target}
          label="Uğur nisbəti"
          value={s?.success_rate ?? '—'}
          suffix="%"
          accent="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
          delay={0.15}
        />
      </div>

      {mistakes > 0 && (
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 dark:border-amber-900/50 dark:from-amber-950/30 dark:to-orange-950/20 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="font-bold">Səhvlər Bankı</p>
              <p className="text-sm text-slate-500">
                {mistakes} sual hələ mənimsənilməyib. Yalnız onları məşq et.
              </p>
            </div>
          </div>
          <button onClick={practiceMistakes} disabled={starting} className="btn-primary">
            <RotateCcw size={18} /> {starting ? 'Hazırlanır…' : 'Səhvləri məşq et'}
          </button>
        </div>
      )}

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Son fəaliyyət</h2>
          <Link to="/statistics" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
            Hamısı <ArrowRight size={14} />
          </Link>
        </div>

        {!data?.recentActivity.length ? (
          <div className="py-12 text-center text-slate-400">
            <ClipboardCheck size={40} className="mx-auto mb-3 opacity-40" />
            Hələ imtahan həll etməmisiniz.{' '}
            <Link to="/tests" className="font-medium text-brand-600 hover:underline">
              İndi başlayın
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-400 dark:border-slate-800">
                  <th className="pb-2 font-medium">Test</th>
                  <th className="pb-2 font-medium">Rejim</th>
                  <th className="pb-2 font-medium">Düz/Səhv</th>
                  <th className="pb-2 font-medium">Bal</th>
                  <th className="pb-2 font-medium">Qiymət</th>
                  <th className="pb-2 font-medium">Tarix</th>
                </tr>
              </thead>
              <tbody>
                {data.recentActivity.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-3 font-medium">{a.test_title}</td>
                    <td className="py-3 text-slate-500">{a.mode}</td>
                    <td className="py-3">
                      <span className="text-emerald-600">{a.correct_count}</span> /{' '}
                      <span className="text-rose-500">{a.wrong_count}</span>
                    </td>
                    <td className="py-3 font-semibold">{a.score}%</td>
                    <td className={`py-3 font-bold ${gradeColor(a.grade)}`}>{a.grade}</td>
                    <td className="py-3 text-slate-400">
                      {new Date(a.submitted_at).toLocaleDateString('az')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

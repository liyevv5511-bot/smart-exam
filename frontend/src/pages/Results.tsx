import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  RotateCcw,
  Eye,
  Home,
  Award,
} from 'lucide-react';
import { api, apiError } from '../api/client';

const gradeMeta: Record<string, { label: string; color: string; ring: string }> = {
  A: { label: 'Əla', color: 'text-emerald-600', ring: '#10b981' },
  B: { label: 'Yaxşı', color: 'text-brand-600', ring: '#3366ff' },
  C: { label: 'Orta', color: 'text-amber-600', ring: '#f59e0b' },
  D: { label: 'Zəif', color: 'text-orange-600', ring: '#f97316' },
  F: { label: 'Kəsr', color: 'text-rose-600', ring: '#f43f5e' },
};

export default function Results() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [r, setR] = useState<any>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    api.get(`/exams/${sessionId}/result`).then((res) => setR(res.data.result));
  }, [sessionId]);

  const retryWrong = async () => {
    setRetrying(true);
    try {
      const { data } = await api.post(`/exams/${sessionId}/retry-wrong`);
      navigate(`/exam/${data.session.id}`, { state: data });
    } catch (e) {
      toast.error(apiError(e));
      setRetrying(false);
    }
  };

  if (!r) return <p className="text-slate-400">Yüklənir…</p>;

  const score = Number(r.score);
  const meta = gradeMeta[r.grade] || gradeMeta.F;
  const circ = 2 * Math.PI * 54;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card text-center"
      >
        <Award size={32} className={`mx-auto mb-2 ${meta.color}`} />
        <h1 className="text-xl font-bold">{r.test_title}</h1>
        <p className="text-sm text-slate-400">İmtahan nəticəniz</p>

        {/* Bal halqası */}
        <div className="relative mx-auto my-6 h-40 w-40">
          <svg className="h-40 w-40 -rotate-90">
            <circle cx="80" cy="80" r="54" fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-100 dark:text-slate-800" />
            <motion.circle
              cx="80" cy="80" r="54" fill="none" stroke={meta.ring} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: circ - (circ * score) / 100 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div>
              <p className="text-4xl font-extrabold">{score}%</p>
              <p className={`text-lg font-bold ${meta.color}`}>{r.grade}</p>
            </div>
          </div>
        </div>
        <p className={`font-semibold ${meta.color}`}>{meta.label}</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card text-center">
          <p className="text-2xl font-extrabold">{r.total}</p>
          <p className="text-sm text-slate-400">Ümumi</p>
        </div>
        <div className="card text-center">
          <CheckCircle2 size={20} className="mx-auto mb-1 text-emerald-500" />
          <p className="text-2xl font-extrabold text-emerald-600">{r.correct_count}</p>
          <p className="text-sm text-slate-400">Düzgün</p>
        </div>
        <div className="card text-center">
          <XCircle size={20} className="mx-auto mb-1 text-rose-500" />
          <p className="text-2xl font-extrabold text-rose-600">{r.wrong_count}</p>
          <p className="text-sm text-slate-400">Yanlış</p>
        </div>
        <div className="card text-center">
          <MinusCircle size={20} className="mx-auto mb-1 text-slate-400" />
          <p className="text-2xl font-extrabold text-slate-500">{r.unanswered_count}</p>
          <p className="text-sm text-slate-400">Cavabsız</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {r.wrong_count > 0 && (
          <>
            <Link to={`/review/${sessionId}`} className="btn-ghost">
              <Eye size={18} /> Səhvlərə bax
            </Link>
            <button onClick={retryWrong} disabled={retrying} className="btn-primary">
              <RotateCcw size={18} /> {retrying ? 'Hazırlanır…' : 'Səhvləri təcrübə et'}
            </button>
          </>
        )}
      </div>

      <Link to="/" className="btn-ghost w-full">
        <Home size={18} /> İdarəetmə Panelinə qayıt
      </Link>
    </div>
  );
}

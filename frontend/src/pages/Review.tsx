import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  XCircle,
  CheckCircle2,
  Lightbulb,
  RotateCcw,
  FileDown,
  FileSpreadsheet,
} from 'lucide-react';
import { api, apiError } from '../api/client';
import { exportReviewCSV, exportPDF } from '../utils/export';
import type { ReviewItem } from '../types';

export default function Review() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    api
      .get(`/exams/${sessionId}/review`)
      .then((r) => setItems(r.data.review))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const retry = async () => {
    setRetrying(true);
    try {
      const { data } = await api.post(`/exams/${sessionId}/retry-wrong`);
      navigate(`/exam/${data.session.id}`, { state: data });
    } catch (e) {
      toast.error(apiError(e));
      setRetrying(false);
    }
  };

  if (loading) return <p className="text-slate-400">Yüklənir…</p>;

  return (
    <div className="space-y-6 print:space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button
          onClick={() => navigate(`/results/${sessionId}`)}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"
        >
          <ArrowLeft size={16} /> Nəticəyə qayıt
        </button>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportReviewCSV(items)} className="btn-ghost">
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button onClick={exportPDF} className="btn-ghost">
            <FileDown size={16} /> PDF
          </button>
          {items.length > 0 && (
            <button onClick={retry} disabled={retrying} className="btn-primary">
              <RotateCcw size={16} /> Səhvləri təcrübə et
            </button>
          )}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-extrabold">Yanlış Sualların İcmalı</h1>
        <p className="text-sm text-slate-500">
          {items.length} sual düzgün cavablanmadı (səhv + cavabsız).
        </p>
      </div>

      {!items.length ? (
        <div className="card py-16 text-center">
          <CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-500" />
          <p className="text-lg font-bold">Təbriklər! 🎉</p>
          <p className="text-slate-400">Bütün suallara düzgün cavab verdiniz.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, i) => (
            <motion.div
              key={item.questionId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card"
            >
              <div className="mb-3 flex items-start gap-2">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800">
                  {i + 1}
                </span>
                <p className="font-semibold">{item.question}</p>
              </div>

              <div className="space-y-2 pl-8">
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm dark:bg-rose-950/30">
                  <XCircle size={16} className="shrink-0 text-rose-500" />
                  <span className="text-slate-500">Sizin cavab:</span>
                  <span className="font-medium text-rose-600">
                    {item.yourAnswerText ?? '(cavablandırılmayıb)'}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950/30">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                  <span className="text-slate-500">Düzgün cavab:</span>
                  <span className="font-medium text-emerald-600">
                    {item.correctAnswerText}
                  </span>
                </div>
                {item.explanation && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/20">
                    <Lightbulb size={16} className="mt-0.5 shrink-0 text-amber-500" />
                    <span className="text-slate-600 dark:text-slate-300">
                      {item.explanation}
                    </span>
                  </div>
                )}
                {(item.difficulty || item.reference) && (
                  <div className="flex flex-wrap gap-2 pt-1 text-xs">
                    {item.difficulty && (
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-500 dark:bg-slate-800">
                        Çətinlik: {item.difficulty}
                      </span>
                    )}
                    {item.reference && (
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-500 dark:bg-slate-800">
                        İstinad: {item.reference}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

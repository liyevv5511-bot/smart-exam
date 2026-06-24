import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Flag,
  WifiOff,
  Home,
  Lightbulb,
} from 'lucide-react';
import { getOfflineTest, addPending, OfflineQuestion } from '../offline/db';
import { useOffline } from '../offline/OfflineContext';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const grade = (s: number) =>
  s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : s >= 60 ? 'D' : 'F';

export default function OfflineExam() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useOffline();

  const cfg = (location.state as any)?.config || { mode: 'full' };
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<OfflineQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'exam' | 'result'>('loading');
  const [result, setResult] = useState<any>(null);
  const startedAt = useMemo(() => new Date().toISOString(), []);

  useEffect(() => {
    (async () => {
      const t = await getOfflineTest(testId!);
      if (!t) {
        toast.error('Bu test offline endirilməyib.');
        navigate('/tests');
        return;
      }
      setTitle(t.test.title);
      let qs = [...t.questions].sort((a, b) => a.position - b.position);
      if (cfg.mode === 'range') qs = qs.filter((q) => q.position >= cfg.from && q.position <= cfg.to);
      else if (cfg.mode === 'random') qs = shuffle(qs).slice(0, cfg.count || 20);
      if (!qs.length) {
        toast.error('Seçilmiş diapazonda sual yoxdur.');
        navigate('/tests');
        return;
      }
      setQuestions(shuffle(qs)); // sual sırası təsadüfi, variantlar orijinal
      setPhase('exam');
    })();
  }, [testId]);

  const submit = async () => {
    let correct = 0;
    let unanswered = 0;
    questions.forEach((q) => {
      const sel = answers[q.id];
      if (sel === undefined) unanswered++;
      else if (sel === q.correct_index) correct++;
    });
    const total = questions.length;
    const wrong = total - correct - unanswered;
    const score = total ? Math.round((correct / total) * 10000) / 100 : 0;

    // offline nəticəni sinxronizasiya növbəsinə əlavə et
    await addPending({
      localId: (crypto as any).randomUUID ? crypto.randomUUID() : String(Date.now()),
      testId: testId!,
      testTitle: title,
      mode: cfg.mode,
      startedAt,
      answers: questions.map((q) => ({ questionId: q.id, originalIndex: answers[q.id] ?? null })),
      summary: { total, correct, wrong, unanswered, score },
    });
    await refresh();

    const review = questions
      .filter((q) => answers[q.id] !== q.correct_index)
      .map((q) => ({
        question: q.text,
        your: answers[q.id] !== undefined ? q.options[answers[q.id]] : null,
        correct: q.options[q.correct_index],
        explanation: q.explanation,
      }));
    setResult({ total, correct, wrong, unanswered, score, grade: grade(score), review });
    setPhase('result');
  };

  if (phase === 'loading')
    return (
      <div className="grid h-[60vh] place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );

  // ---------- NƏTİCƏ ----------
  if (phase === 'result') {
    const meta: Record<string, string> = { A: 'text-emerald-600', B: 'text-brand-600', C: 'text-amber-600', D: 'text-orange-600', F: 'text-rose-600' };
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="card text-center">
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="mb-4 text-sm text-slate-400">Offline imtahan nəticəsi</p>
          <p className="text-5xl font-extrabold">{result.score}%</p>
          <p className={`text-2xl font-bold ${meta[result.grade]}`}>{result.grade}</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
            <WifiOff size={13} /> İnternet qayıdanda avtomatik sinxronlaşacaq
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="card text-center"><p className="text-2xl font-extrabold">{result.total}</p><p className="text-sm text-slate-400">Ümumi</p></div>
          <div className="card text-center"><CheckCircle2 size={18} className="mx-auto mb-1 text-emerald-500" /><p className="text-2xl font-extrabold text-emerald-600">{result.correct}</p><p className="text-sm text-slate-400">Düzgün</p></div>
          <div className="card text-center"><XCircle size={18} className="mx-auto mb-1 text-rose-500" /><p className="text-2xl font-extrabold text-rose-600">{result.wrong}</p><p className="text-sm text-slate-400">Yanlış</p></div>
          <div className="card text-center"><MinusCircle size={18} className="mx-auto mb-1 text-slate-400" /><p className="text-2xl font-extrabold text-slate-500">{result.unanswered}</p><p className="text-sm text-slate-400">Cavabsız</p></div>
        </div>

        {result.review.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-bold">Yanlış suallar ({result.review.length})</h2>
            {result.review.map((r: any, i: number) => (
              <div key={i} className="card">
                <p className="mb-2 font-semibold">{i + 1}. {r.question}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 dark:bg-rose-950/30">
                    <XCircle size={15} className="shrink-0 text-rose-500" />
                    <span className="text-slate-500">Sizin:</span>
                    <span className="font-medium text-rose-600">{r.your ?? '(cavabsız)'}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/30">
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                    <span className="text-slate-500">Düzgün:</span>
                    <span className="font-medium text-emerald-600">{r.correct}</span>
                  </div>
                  {r.explanation && (
                    <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/20">
                      <Lightbulb size={15} className="mt-0.5 shrink-0 text-amber-500" />
                      <span className="text-slate-600 dark:text-slate-300">{r.explanation}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => navigate('/')} className="btn-ghost w-full">
          <Home size={18} /> İdarəetmə Panelinə qayıt
        </button>
      </div>
    );
  }

  // ---------- İMTAHAN ----------
  const q = questions[idx];
  const answered = Object.keys(answers).length;
  const pct = questions.length ? (answered / questions.length) * 100 : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2 flex items-center justify-between text-sm font-semibold">
        <span>
          <span className="text-slate-400">Sual </span>
          <span className="text-brand-600">{idx + 1}</span>
          <span className="text-slate-400"> / {questions.length}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <WifiOff size={12} /> Offline · Seçimlər: {q.options.length}
        </span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* Naviqator */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1.5">
        {questions.map((qq, i) => {
          const done = answers[qq.id] !== undefined;
          return (
            <button
              key={qq.id}
              onClick={() => setIdx(i)}
              className={`grid h-8 min-w-[2rem] shrink-0 place-items-center rounded-lg border text-xs font-bold ${
                i === idx ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-slate-200 dark:border-slate-700'
              } ${done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
          <h2 className="mb-6 text-xl font-bold leading-relaxed">{q.text}</h2>
          <div className="space-y-3">
            {q.options.map((opt, i) => {
              const active = answers[q.id] === i;
              return (
                <button
                  key={i}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${
                    active ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:bg-brand-950/40' : 'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                    {LETTERS[i]}
                  </span>
                  <span className="text-sm">{opt}</span>
                  {active && <CheckCircle2 size={18} className="ml-auto text-brand-600" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex items-center justify-between gap-3">
        <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} className="btn-ghost">
          <ChevronLeft size={18} /> Əvvəlki
        </button>
        {idx === questions.length - 1 ? (
          <button onClick={submit} className="btn-primary">
            <Flag size={16} /> Təqdim et
          </button>
        ) : (
          <button onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))} className="btn-primary">
            Növbəti <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

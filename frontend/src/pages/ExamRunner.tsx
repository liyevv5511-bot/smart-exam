import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Moon,
  Sun,
  CheckCircle2,
  XCircle,
  Save,
  Flag,
  Lightbulb,
  GraduationCap,
  Languages,
} from 'lucide-react';
import { api, apiError } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import type { ExamQuestion } from '../types';

type Answers = Record<string, number>; // questionId → seçilən variant indeksi (göstərilən sıra)
interface Feedback {
  isCorrect: boolean;
  correctIndex: number; // göstərilən sıradakı düzgün indeks
  correctText: string;
  explanation?: string;
}

export default function ExamRunner() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();

  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [idx, setIdx] = useState(0);
  const [total, setTotal] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [practice, setPractice] = useState(false);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  // Tərcümə: orijinal / az / tr
  const [lang, setLang] = useState<'orig' | 'az' | 'tr'>('orig');
  const [translations, setTranslations] = useState<
    Record<string, Record<string, { text: string; options: string[] }>>
  >({});
  const [translating, setTranslating] = useState(false);

  const dirty = useRef<Set<string>>(new Set());
  const answersRef = useRef<Answers>({});
  answersRef.current = answers;

  // ---- Yüklə (state-dən və ya resume) ----
  useEffect(() => {
    const init = location.state as any;
    if (init?.questions) {
      setQuestions(init.questions);
      setTotal(init.session.total);
      setPractice(!!init.session.practice);
      if (init.session.durationSec) setRemaining(init.session.durationSec);
    } else {
      api
        .get(`/exams/${sessionId}/resume`)
        .then((r) => {
          setQuestions(r.data.questions);
          setTotal(r.data.session.total);
          setPractice(!!r.data.session.practice);
          if (r.data.flagged) setFlagged(new Set(r.data.flagged));
          const saved: Answers = {};
          r.data.savedAnswers.forEach((a: any) => (saved[a.questionId] = a.selectedIndex));
          setAnswers(saved);
          if (r.data.session.durationSec) {
            const elapsed = Math.floor(
              (Date.now() - new Date(r.data.session.startedAt).getTime()) / 1000
            );
            setRemaining(Math.max(0, r.data.session.durationSec - elapsed));
          }
        })
        .catch((e) => {
          toast.error(apiError(e));
          navigate('/tests');
        });
    }
  }, [sessionId]);

  // ---- Avtomatik yadda saxlama (hər 5 saniyə) ----
  const flush = useCallback(async () => {
    if (!dirty.current.size) return;
    const batch = [...dirty.current].map((qid) => ({
      questionId: qid,
      selectedIndex: answersRef.current[qid] ?? null,
    }));
    dirty.current.clear();
    setSaving(true);
    try {
      await api.patch(`/exams/${sessionId}/answer`, { answers: batch });
    } catch {
      batch.forEach((b) => dirty.current.add(b.questionId)); // uğursuz olsa geri qaytar
    } finally {
      setSaving(false);
    }
  }, [sessionId]);

  useEffect(() => {
    const t = setInterval(flush, 5000);
    const onUnload = () => flush();
    window.addEventListener('beforeunload', onUnload);
    return () => {
      clearInterval(t);
      window.removeEventListener('beforeunload', onUnload);
      flush();
    };
  }, [flush]);

  // ---- Taymer ----
  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      submit(true);
      return;
    }
    const t = setTimeout(() => setRemaining((r) => (r === null ? r : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const select = async (qid: string, index: number) => {
    if (practice && feedback[qid]) return; // məşq rejimində cavab kilidlənir
    setAnswers((a) => ({ ...a, [qid]: index }));
    // ref-i DƏRHAL yenilə ki, flush/check köhnə deyil, yeni cavabı göndərsin
    answersRef.current = { ...answersRef.current, [qid]: index };
    dirty.current.add(qid);

    // Məşq rejimi: dərhal yoxla
    if (practice) {
      await flush(); // cavabı serverə yaz
      try {
        const { data } = await api.post(`/exams/${sessionId}/check`, { questionId: qid });
        setFeedback((f) => ({ ...f, [qid]: data }));
      } catch (e) {
        toast.error(apiError(e));
      }
    }
  };

  const toggleFlag = async (qid: string) => {
    const isFlagged = flagged.has(qid);
    setFlagged((s) => {
      const n = new Set(s);
      isFlagged ? n.delete(qid) : n.add(qid);
      return n;
    });
    try {
      await api.patch(`/exams/${sessionId}/flag`, { questionId: qid, flagged: !isFlagged });
    } catch {
      /* səssiz */
    }
  };

  const submit = async (auto = false) => {
    if (submitting) return;
    if (!auto && Object.keys(answers).length < total) {
      const left = total - Object.keys(answers).length;
      if (!confirm(`${left} sual cavablandırılmayıb. Yenə də təqdim edilsin?`)) return;
    }
    setSubmitting(true);
    await flush();
    try {
      await api.post(`/exams/${sessionId}/submit`);
      if (auto) toast('Vaxt bitdi — imtahan təqdim edildi.', { icon: '⏰' });
      navigate(`/results/${sessionId}`);
    } catch (e) {
      toast.error(apiError(e));
      setSubmitting(false);
    }
  };

  // ---- Klaviatura qısayolları ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showNav) return;
      const cur = questions[idx];
      if (!cur) return;
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
      else if (e.key === 'ArrowRight') setIdx((i) => Math.min(total - 1, i + 1));
      else if (e.key === 'Enter') {
        if (idx === total - 1) submit();
        else setIdx((i) => Math.min(total - 1, i + 1));
      } else if (e.key === 'f' || e.key === 'F') toggleFlag(cur.id);
      else {
        // rəqəm (1..9) və ya hərf (a..z) → variant seç
        let optIdx = -1;
        if (/^[1-9]$/.test(e.key)) optIdx = +e.key - 1;
        else if (/^[a-zA-Z]$/.test(e.key)) optIdx = e.key.toLowerCase().charCodeAt(0) - 97;
        if (optIdx >= 0 && optIdx < cur.options.length) select(cur.id, cur.options[optIdx].index);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, total, questions, showNav, practice, feedback]);

  // ---- Tərcümə: cari sualı seçilmiş dilə çevir (ehtiyac olduqda) ----
  useEffect(() => {
    if (lang === 'orig') return;
    const cur = questions[idx];
    if (!cur || translations[cur.id]?.[lang]) return;
    let cancelled = false;
    setTranslating(true);
    const texts = [cur.text, ...cur.options.map((o) => o.text)];
    api
      .post('/translate', { target: lang, texts })
      .then((r) => {
        if (cancelled) return;
        const arr: string[] = r.data.translations || [];
        setTranslations((prev) => ({
          ...prev,
          [cur.id]: { ...(prev[cur.id] || {}), [lang]: { text: arr[0], options: arr.slice(1) } },
        }));
      })
      .catch(() => {})
      .finally(() => !cancelled && setTranslating(false));
    return () => {
      cancelled = true;
    };
  }, [idx, lang, questions]);

  const q = questions[idx];
  if (!q)
    return (
      <div className="grid h-screen place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );

  const answered = Object.keys(answers).length;
  const pct = total ? (answered / total) * 100 : 0;
  // Cari sualın tərcüməsi (varsa)
  const trCur = lang !== 'orig' ? translations[q.id]?.[lang] : undefined;
  const displayText = trCur?.text || q.text;
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Üst panel */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="text-sm font-semibold">
            <span className="text-slate-400">Sual </span>
            <span className="text-brand-600">{idx + 1}</span>
            <span className="text-slate-400"> / {total}</span>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="hidden items-center gap-1 text-xs text-slate-400 sm:flex">
                <Save size={12} /> Saxlanılır…
              </span>
            )}
            {remaining !== null && (
              <span
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums ${
                  remaining < 60
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50'
                    : 'bg-slate-100 dark:bg-slate-800'
                }`}
              >
                <Clock size={14} /> {fmt(remaining)}
              </span>
            )}
            <button onClick={toggle} className="btn-ghost !px-2.5 !py-2">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
        {/* İrəliləyiş paneli */}
        <div className="h-1 bg-slate-100 dark:bg-slate-800">
          <motion.div
            className="h-full bg-brand-600"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Daimi sual naviqatoru — nömrələr: yaşıl = cavablanıb, ağ = boş */}
        <div className="mx-auto max-w-3xl px-3 py-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1.5">
            {questions.map((qq, i) => {
              const done = answers[qq.id] !== undefined;
              const current = i === idx;
              const isFlagged = flagged.has(qq.id);
              return (
                <button
                  key={qq.id}
                  onClick={() => setIdx(i)}
                  title={`Sual ${i + 1}${done ? ' (cavablanıb)' : ''}${isFlagged ? ' • nişanlı' : ''}`}
                  className={`relative grid h-8 min-w-[2rem] shrink-0 place-items-center rounded-lg border text-xs font-bold transition ${
                    current
                      ? 'border-brand-500 ring-2 ring-brand-500/30'
                      : 'border-slate-200 dark:border-slate-700'
                  } ${
                    done
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                      : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {i + 1}
                  {isFlagged && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800">
                  Seçimlər: {q.optionCount}
                </span>
                {practice && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <GraduationCap size={13} /> Məşq rejimi
                  </span>
                )}
                {/* Dil / tərcümə seçici */}
                <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-0.5 dark:bg-slate-800">
                  <Languages size={13} className="ml-1.5 text-slate-400" />
                  {(['orig', 'az', 'tr'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold transition ${
                        lang === l
                          ? 'bg-brand-600 text-white'
                          : 'text-slate-500 hover:text-brand-600'
                      }`}
                    >
                      {l === 'orig' ? 'Orijinal' : l.toUpperCase()}
                    </button>
                  ))}
                  {translating && <span className="px-1 text-xs text-slate-400">…</span>}
                </div>
              </div>
              <button
                onClick={() => toggleFlag(q.id)}
                title="Nişanla (F)"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  flagged.has(q.id)
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800'
                }`}
              >
                <Flag size={13} /> {flagged.has(q.id) ? 'Nişanlı' : 'Nişanla'}
              </button>
            </div>
            <h2 className="mb-6 text-xl font-bold leading-relaxed">{displayText}</h2>
            <div className="space-y-3">
              {q.options.map((opt) => {
                const active = answers[q.id] === opt.index;
                const fb = feedback[q.id];
                // Məşq rejimində cavabdan sonra rənglər
                const isCorrectOpt = fb && opt.index === fb.correctIndex;
                const isWrongChosen = fb && active && !fb.isCorrect;
                let cls =
                  'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900';
                if (isCorrectOpt) cls = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40';
                else if (isWrongChosen) cls = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40';
                else if (active) cls = 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:bg-brand-950/40';
                return (
                  <button
                    key={opt.index}
                    onClick={() => select(q.id, opt.index)}
                    disabled={!!fb}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition disabled:cursor-default ${cls}`}
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${
                        isCorrectOpt
                          ? 'bg-emerald-600 text-white'
                          : isWrongChosen
                          ? 'bg-rose-500 text-white'
                          : active
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="text-sm">{trCur?.options[opt.index] ?? opt.text}</span>
                    {isCorrectOpt && <CheckCircle2 size={18} className="ml-auto text-emerald-600" />}
                    {isWrongChosen && <XCircle size={18} className="ml-auto text-rose-500" />}
                    {!fb && active && <CheckCircle2 size={18} className="ml-auto text-brand-600" />}
                  </button>
                );
              })}
            </div>

            {/* Məşq rejimi: izah paneli */}
            {practice && feedback[q.id] && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 rounded-xl border p-4 text-sm ${
                  feedback[q.id].isCorrect
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
                    : 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30'
                }`}
              >
                <p className="mb-1 font-bold">
                  {feedback[q.id].isCorrect ? '✓ Düzgün!' : '✗ Səhv'}
                </p>
                {!feedback[q.id].isCorrect && (
                  <p className="text-slate-600 dark:text-slate-300">
                    Düzgün cavab: <b>{feedback[q.id].correctText}</b>
                  </p>
                )}
                {feedback[q.id].explanation && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-slate-500">
                    <Lightbulb size={15} className="mt-0.5 shrink-0 text-amber-500" />
                    {feedback[q.id].explanation}
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Naviqasiya düymələri */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="btn-ghost"
          >
            <ChevronLeft size={18} /> Əvvəlki
          </button>

          <button onClick={() => setShowNav(true)} className="btn-ghost">
            Suallar
          </button>

          {idx === total - 1 ? (
            <button onClick={() => submit()} disabled={submitting} className="btn-primary">
              <Flag size={16} /> {submitting ? 'Təqdim olunur…' : 'Təqdim et'}
            </button>
          ) : (
            <button onClick={() => setIdx((i) => Math.min(total - 1, i + 1))} className="btn-primary">
              Növbəti <ChevronRight size={18} />
            </button>
          )}
        </div>
      </main>

      {/* Sual naviqatoru */}
      <AnimatePresence>
        {showNav && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNav(false)}
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-slate-900"
            >
              <h3 className="mb-4 font-bold">Sual naviqatoru</h3>
              <div className="grid grid-cols-8 gap-2">
                {questions.map((qq, i) => {
                  const done = answers[qq.id] !== undefined;
                  return (
                    <button
                      key={qq.id}
                      onClick={() => {
                        setIdx(i);
                        setShowNav(false);
                      }}
                      className={`grid h-9 place-items-center rounded-lg text-sm font-semibold transition ${
                        i === idx
                          ? 'bg-brand-600 text-white'
                          : done
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-emerald-200" /> Cavablanıb
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-700" /> Boş
                </span>
                <span className="ml-auto font-semibold text-slate-500">
                  {answered}/{total}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

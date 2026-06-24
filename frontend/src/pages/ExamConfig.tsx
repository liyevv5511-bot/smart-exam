import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { ListOrdered, Shuffle, Layers, Clock, ArrowLeft, Play, GraduationCap, Tag } from 'lucide-react';
import { api, apiError } from '../api/client';
import type { Test, TopicCount } from '../types';
import { getOfflineTest } from '../offline/db';
import { useOffline } from '../offline/OfflineContext';

type Mode = 'range' | 'random' | 'full';

export default function ExamConfig() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { online } = useOffline();
  const [test, setTest] = useState<Test | null>(null);
  const [mode, setMode] = useState<Mode>('full');
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(50);
  const [count, setCount] = useState(20);
  const [timed, setTimed] = useState(false);
  const [minutes, setMinutes] = useState(30);
  const [practice, setPractice] = useState(false);
  const [topics, setTopics] = useState<TopicCount[]>([]);
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get(`/tests/${testId}`)
      .then((r) => {
        setTest(r.data.test);
        setTo(Math.min(50, r.data.test.question_count));
        setCount(Math.min(20, r.data.test.question_count));
      })
      .catch(async () => {
        // İnternet yoxdursa offline endirilmiş testdən oxu
        const off = await getOfflineTest(testId!);
        if (off) {
          setTest(off.test as any);
          setTo(Math.min(50, off.test.question_count));
          setCount(Math.min(20, off.test.question_count));
        }
      });
    api.get(`/tests/${testId}/topics`).then((r) => setTopics(r.data.topics)).catch(() => {});
  }, [testId]);

  const start = async () => {
    // İnternet yoxdursa → offline imtahan (server olmadan)
    if (!online) {
      const off = await getOfflineTest(testId!);
      if (!off) return toast.error('Bu test offline endirilməyib.');
      const config: any = { mode };
      if (mode === 'range') Object.assign(config, { from, to });
      if (mode === 'random') config.count = count;
      navigate(`/offline-exam/${testId}`, { state: { config } });
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        testId,
        mode,
        durationSec: timed && !practice ? minutes * 60 : undefined,
        practice,
        topic: topic || undefined,
      };
      if (mode === 'range') Object.assign(payload, { from, to });
      if (mode === 'random') payload.count = count;
      const { data } = await api.post('/exams/start', payload);
      navigate(`/exam/${data.session.id}`, { state: data });
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  const modes = [
    {
      id: 'range' as Mode,
      icon: ListOrdered,
      title: 'Xüsusi Sual Aralığı',
      desc: 'Məs: 1–50, 51–100 arası suallar',
    },
    {
      id: 'random' as Mode,
      icon: Shuffle,
      title: 'Təsadüfi Suallar',
      desc: 'Təsadüfi 20 / 50 / 100 sual',
    },
    {
      id: 'full' as Mode,
      icon: Layers,
      title: 'Tam İmtahan',
      desc: 'Bütün suallardan istifadə et',
    },
  ];

  if (!test) return <p className="text-slate-400">Yüklənir…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button
        onClick={() => navigate('/tests')}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"
      >
        <ArrowLeft size={16} /> Testlərə qayıt
      </button>

      <div>
        <h1 className="text-2xl font-extrabold">{test.title}</h1>
        <p className="text-sm text-slate-500">
          {test.question_count} sual · İmtahan rejimini seçin
        </p>
      </div>

      <div className="space-y-3">
        {modes.map((m) => (
          <motion.button
            key={m.id}
            whileTap={{ scale: 0.99 }}
            onClick={() => setMode(m.id)}
            className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
              mode === m.id
                ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:bg-brand-950/30'
                : 'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <div
              className={`grid h-11 w-11 place-items-center rounded-xl ${
                mode === m.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
              }`}
            >
              <m.icon size={20} />
            </div>
            <div>
              <p className="font-semibold">{m.title}</p>
              <p className="text-sm text-slate-400">{m.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Rejimə görə əlavə parametrlər */}
      {mode === 'range' && (
        <div className="card space-y-4">
          <div>
            <label className="label">Hazır aralıqlar</label>
            <div className="flex flex-wrap gap-2">
              {[
                [1, 50],
                [51, 100],
                [101, 200],
                [201, 250],
                [500, 700],
              ]
                .filter(([a]) => a <= test.question_count)
                .map(([a, b]) => {
                  const bb = Math.min(b, test.question_count);
                  const active = from === a && to === bb;
                  return (
                    <button
                      key={`${a}-${b}`}
                      onClick={() => {
                        setFrom(a);
                        setTo(bb);
                      }}
                      className={active ? 'btn-primary' : 'btn-ghost'}
                    >
                      {a}–{bb}
                    </button>
                  );
                })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Başlanğıc sual</label>
              <input
                type="number"
                min={1}
                max={test.question_count}
                value={from}
                onChange={(e) => setFrom(+e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Son sual</label>
              <input
                type="number"
                min={from}
                max={test.question_count}
                value={to}
                onChange={(e) => setTo(+e.target.value)}
                className="input"
              />
            </div>
          </div>
          <p className="text-sm text-slate-400">
            Seçilən: <b>{Math.max(0, Math.min(to, test.question_count) - from + 1)}</b> sual
            (cəmi {test.question_count})
          </p>
        </div>
      )}

      {mode === 'random' && (
        <div className="card space-y-3">
          <label className="label">Sual sayı</label>
          <div className="flex flex-wrap gap-2">
            {[20, 50, 100, 200].filter((n) => n <= test.question_count).map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={count === n ? 'btn-primary' : 'btn-ghost'}
              >
                Təsadüfi {n}
              </button>
            ))}
          </div>
          <div>
            <label className="label">Və ya xüsusi say (N)</label>
            <input
              type="number"
              min={1}
              max={test.question_count}
              value={count}
              onChange={(e) =>
                setCount(Math.min(test.question_count, Math.max(1, +e.target.value)))
              }
              className="input w-40"
            />
          </div>
        </div>
      )}

      {/* Mövzu filtri */}
      {topics.length > 0 && (
        <div className="card">
          <label className="label flex items-center gap-1.5">
            <Tag size={15} /> Mövzu üzrə filtr (istəyə bağlı)
          </label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setTopic('')} className={topic === '' ? 'btn-primary' : 'btn-ghost'}>
              Hamısı
            </button>
            {topics.map((t) => (
              <button
                key={t.topic}
                onClick={() => setTopic(t.topic)}
                className={topic === t.topic ? 'btn-primary' : 'btn-ghost'}
              >
                {t.topic} ({t.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Məşq rejimi */}
      <div className="card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap size={20} className="text-emerald-600" />
          <div>
            <p className="font-semibold">Məşq rejimi</p>
            <p className="text-sm text-slate-400">
              Hər cavabdan sonra dərhal düzgün cavab və izah göstərilir
            </p>
          </div>
        </div>
        <button
          onClick={() => setPractice(!practice)}
          className={`relative h-6 w-11 rounded-full transition ${
            practice ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
              practice ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {/* Taymer (məşq rejimində qeyri-aktiv) */}
      <div className={`card flex items-center justify-between ${practice ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-3">
          <Clock size={20} className="text-brand-600" />
          <div>
            <p className="font-semibold">Vaxt limiti</p>
            <p className="text-sm text-slate-400">
              {practice ? 'Məşq rejimində taymer yoxdur' : 'İmtahana taymer əlavə et'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {timed && !practice && (
            <input
              type="number"
              min={1}
              value={minutes}
              onChange={(e) => setMinutes(+e.target.value)}
              className="input w-20"
            />
          )}
          <button
            onClick={() => setTimed(!timed)}
            disabled={practice}
            className={`relative h-6 w-11 rounded-full transition disabled:cursor-not-allowed ${
              timed && !practice ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                timed ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      <button onClick={start} disabled={loading} className="btn-primary w-full !py-3 text-base">
        <Play size={18} /> {loading ? 'Hazırlanır…' : 'İmtahana başla'}
      </button>
    </div>
  );
}

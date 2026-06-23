import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Search, Save, CheckCircle2, Tag } from 'lucide-react';
import { api, apiError } from '../api/client';

interface QRow {
  id: string;
  position: number;
  text: string;
  options: string[];
  option_count: number;
  correct_index: number;
  explanation?: string;
  topic?: string;
  difficulty?: string;
  _dirty?: boolean;
  _saving?: boolean;
}

const LETTER = (i: number) => String.fromCharCode(65 + i);

export default function TestEditor() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<QRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = (search = '') => {
    setLoading(true);
    api
      .get(`/tests/${testId}`, { params: search ? { q: search } : {} })
      .then((r) => {
        setTitle(r.data.test.title);
        setQuestions(r.data.questions);
      })
      .catch((e) => {
        toast.error(apiError(e));
        navigate('/tests');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [testId]);

  const patch = (id: string, changes: Partial<QRow>) =>
    setQuestions((qs) => qs.map((x) => (x.id === id ? { ...x, ...changes, _dirty: true } : x)));

  const save = async (item: QRow) => {
    setQuestions((qs) => qs.map((x) => (x.id === item.id ? { ...x, _saving: true } : x)));
    try {
      await api.patch(`/tests/${testId}/questions/${item.id}`, {
        text: item.text,
        options: item.options,
        correctIndex: item.correct_index,
        explanation: item.explanation ?? null,
        topic: item.topic ?? null,
        difficulty: item.difficulty ?? null,
      });
      setQuestions((qs) =>
        qs.map((x) => (x.id === item.id ? { ...x, _dirty: false, _saving: false } : x))
      );
      toast.success(`Sual ${item.position} yadda saxlanıldı.`);
    } catch (e) {
      toast.error(apiError(e));
      setQuestions((qs) => qs.map((x) => (x.id === item.id ? { ...x, _saving: false } : x)));
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/tests')}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"
      >
        <ArrowLeft size={16} /> Testlərə qayıt
      </button>

      <div>
        <h1 className="text-2xl font-extrabold">Redaktə: {title}</h1>
        <p className="text-sm text-slate-500">
          Sual mətnini, variantları və <b>düzgün cavabı</b> düzəlt. Düzgün cavab üçün
          variantın hərfinə klikləyin.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
        className="relative max-w-sm"
      >
        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input pl-9"
          placeholder="Sual axtar…"
        />
      </form>

      {loading ? (
        <p className="text-slate-400">Yüklənir…</p>
      ) : (
        <div className="space-y-4">
          {questions.map((item) => (
            <div key={item.id} className="card space-y-3">
              <div className="flex items-start gap-2">
                <span className="mt-1.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800">
                  {item.position}
                </span>
                <textarea
                  value={item.text}
                  onChange={(e) => patch(item.id, { text: e.target.value })}
                  rows={2}
                  className="input flex-1 resize-y"
                />
              </div>

              <div className="space-y-2 pl-8">
                {item.options.map((opt, i) => {
                  const correct = item.correct_index === i;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => patch(item.id, { correct_index: i })}
                        title="Düzgün cavab et"
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold transition ${
                          correct
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-emerald-100 dark:bg-slate-800'
                        }`}
                      >
                        {LETTER(i)}
                      </button>
                      <input
                        value={opt}
                        onChange={(e) => {
                          const options = [...item.options];
                          options[i] = e.target.value;
                          patch(item.id, { options });
                        }}
                        className={`input flex-1 ${correct ? 'border-emerald-400' : ''}`}
                      />
                      {correct && <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3 pl-8">
                <div className="flex items-center gap-1.5">
                  <Tag size={14} className="text-slate-400" />
                  <input
                    value={item.topic || ''}
                    onChange={(e) => patch(item.id, { topic: e.target.value })}
                    placeholder="Mövzu"
                    className="input !w-40 !py-1.5 text-sm"
                  />
                </div>
                <input
                  value={item.explanation || ''}
                  onChange={(e) => patch(item.id, { explanation: e.target.value })}
                  placeholder="İzah (istəyə bağlı)"
                  className="input flex-1 !py-1.5 text-sm"
                />
                <button
                  onClick={() => save(item)}
                  disabled={!item._dirty || item._saving}
                  className="btn-primary !py-1.5"
                >
                  <Save size={15} /> {item._saving ? 'Saxlanılır…' : 'Saxla'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

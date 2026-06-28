import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, History, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, apiError } from '../api/client';

const GRADE_COLORS: Record<string, string> = {
  A: '#10b981',
  B: '#3366ff',
  C: '#f59e0b',
  D: '#f97316',
  F: '#f43f5e',
};

export default function Statistics() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get('/stats/analytics').then((r) => setData(r.data));
  }, []);

  const deleteResult = async (id: string) => {
    if (!confirm('Bu nəticə silinsin?')) return;
    try {
      await api.delete(`/exams/${id}`);
      setData((d: any) => ({ ...d, history: d.history.filter((h: any) => h.id !== id) }));
      toast.success('Nəticə silindi.');
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  if (!data) return <p className="text-slate-400">Yüklənir…</p>;

  const trend = data.trend.map((t: any) => ({ ...t, score: Number(t.score) }));
  const hasData = trend.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Statistika & Analitika</h1>
        <p className="text-sm text-slate-500">İrəliləyişinizi izləyin.</p>
      </div>

      {!hasData ? (
        <div className="card py-16 text-center text-slate-400">
          Hələ kifayət qədər məlumat yoxdur. Bir neçə imtahan həll edin.
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Bal trendi */}
            <div className="card lg:col-span-2">
              <h3 className="mb-4 flex items-center gap-2 font-bold">
                <TrendingUp size={18} className="text-brand-600" /> Təkmilləşmə trendi
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3366ff" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3366ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                    formatter={(v) => [`${v}%`, 'Bal']}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#3366ff"
                    strokeWidth={2.5}
                    fill="url(#g)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Qiymət paylanması */}
            <div className="card">
              <h3 className="mb-4 flex items-center gap-2 font-bold">
                <PieIcon size={18} className="text-brand-600" /> Qiymət paylanması
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.grades}
                    dataKey="count"
                    nameKey="grade"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {data.grades.map((g: any) => (
                      <Cell key={g.grade} fill={GRADE_COLORS[g.grade] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
                {data.grades.map((g: any) => (
                  <span key={g.grade} className="flex items-center gap-1.5">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: GRADE_COLORS[g.grade] }}
                    />
                    {g.grade}: {g.count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Tarixçə */}
          <div className="card">
            <h3 className="mb-4 flex items-center gap-2 font-bold">
              <History size={18} className="text-brand-600" /> İmtahan tarixçəsi
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-400 dark:border-slate-800">
                    <th className="pb-2 font-medium">Test</th>
                    <th className="hidden pb-2 font-medium sm:table-cell">Rejim</th>
                    <th className="pb-2 font-medium">Düz/Səhv</th>
                    <th className="pb-2 font-medium">Bal</th>
                    <th className="hidden pb-2 font-medium md:table-cell">Tarix</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((h: any) => (
                    <tr key={h.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                      <td className="py-3 font-medium">{h.test_title}</td>
                      <td className="hidden py-3 text-slate-500 sm:table-cell">{h.mode}</td>
                      <td className="py-3">
                        <span className="text-emerald-600">{h.correct_count}</span> /{' '}
                        <span className="text-rose-500">{h.wrong_count}</span>
                      </td>
                      <td className="py-3 font-semibold">{h.score}%</td>
                      <td className="hidden py-3 text-slate-400 md:table-cell">
                        {new Date(h.submitted_at).toLocaleDateString('az')}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => deleteResult(h.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40"
                          title="Nəticəni sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

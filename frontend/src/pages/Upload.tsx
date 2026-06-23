import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  X,
  Eye,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { api, apiError } from '../api/client';
import type { PreviewResult } from '../types';

export default function Upload() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  const pick = (f?: File | null) => {
    if (!f) return;
    if (!/\.(xlsx|xls|pdf)$/i.test(f.name))
      return toast.error('Yalnız .xlsx / .xls / .pdf qəbul edilir.');
    setFile(f);
    setPreview(null);
    if (!title) setTitle(f.name.replace(/\.(xlsx|xls|pdf)$/i, ''));
  };

  // 1) Önizləmə — bazaya yazmadan təhlil
  const doPreview = async () => {
    if (!file) return toast.error('Əvvəlcə fayl seçin.');
    const fd = new FormData();
    fd.append('file', file);
    setLoading(true);
    try {
      const { data } = await api.post('/tests/preview', fd);
      setPreview(data);
    } catch (err: any) {
      const details = err?.response?.data?.details;
      toast.error(details?.[0] || apiError(err));
    } finally {
      setLoading(false);
    }
  };

  // 2) Təsdiq → bazaya yaz
  const commit = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', title);
    setLoading(true);
    try {
      const { data } = await api.post('/tests/upload', fd);
      toast.success(`${data.test.question_count} sual yükləndi! 🎉`);
      navigate(`/tests/${data.test.id}/config`);
    } catch (err: any) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const stratLabel = (s: string) =>
    s === 'tabular'
      ? 'Cədvəl formatı'
      : s === 'embedded'
      ? 'Tək-xana (universitet)'
      : s === 'pdf'
      ? 'PDF (universitet formatı)'
      : 'Blok formatı';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Fayl Yüklə (Excel və ya PDF)</h1>
        <p className="text-sm text-slate-500">
          Faylı yoxlayın, sonra təsdiqləyib testə çevirin.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              pick(e.dataTransfer.files?.[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition ${
              drag
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                : 'border-slate-300 hover:border-brand-400 dark:border-slate-700'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.pdf"
              hidden
              onChange={(e) => pick(e.target.files?.[0])}
            />
            {file ? (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                <FileSpreadsheet size={48} className="mb-3 text-emerald-500" />
                <p className="font-semibold">{file.name}</p>
                <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setPreview(null);
                  }}
                  className="mt-3 inline-flex items-center gap-1 text-sm text-rose-500 hover:underline"
                >
                  <X size={14} /> Sil
                </button>
              </motion.div>
            ) : (
              <>
                <UploadCloud size={48} className="mb-3 text-brand-500" />
                <p className="font-semibold">Faylı buraya sürükləyin</p>
                <p className="text-sm text-slate-400">və ya seçmək üçün klikləyin</p>
              </>
            )}
          </div>

          {file && (
            <div className="space-y-4">
              <div>
                <label className="label">Test başlığı</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input"
                  placeholder="Məs: Mülki Müdafiə — 2025"
                />
              </div>
              {!preview ? (
                <button onClick={doPreview} disabled={loading} className="btn-primary w-full">
                  <Eye size={18} /> {loading ? 'Yoxlanılır…' : 'Faylı yoxla (önizləmə)'}
                </button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => setPreview(null)} className="btn-ghost flex-1">
                    Yenidən yoxla
                  </button>
                  <button onClick={commit} disabled={loading} className="btn-primary flex-1">
                    {loading ? 'Yüklənir…' : `Təsdiqlə (${preview.count} sual)`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Önizləmə nəticəsi */}
          {preview && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card space-y-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <CheckCircle2 size={15} /> {preview.count} sual aşkarlandı
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                  <Sparkles size={15} /> {stratLabel(preview.strategy)}
                </span>
                {preview.topics.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 dark:bg-slate-800">
                    {preview.topics.length} mövzu
                  </span>
                )}
              </div>

              {/* Variant sayı paylanması */}
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(preview.optionDistribution)
                  .sort((a, b) => +a[0] - +b[0])
                  .map(([n, c]) => (
                    <span key={n} className="rounded-md bg-slate-100 px-2 py-1 text-slate-500 dark:bg-slate-800">
                      {n} variant: {c} sual
                    </span>
                  ))}
              </div>

              {preview.warnings.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <b>{preview.warnings.length} sətir buraxıldı.</b>
                    <ul className="mt-1 list-disc pl-4 text-xs opacity-90">
                      {preview.warnings.slice(0, 3).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* İlk suallar */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-500">Nümunə suallar:</p>
                {preview.sample.map((q) => (
                  <div key={q.position} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                    <p className="mb-1 font-medium">
                      {q.position}. {q.text}
                    </p>
                    <div className="space-y-0.5 text-slate-500">
                      {q.options.map((o, i) => (
                        <p key={i} className={String.fromCharCode(65 + i) === q.correct ? 'font-semibold text-emerald-600' : ''}>
                          {String.fromCharCode(65 + i)}) {o}
                          {String.fromCharCode(65 + i) === q.correct && ' ✓'}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Format təlimatı */}
        <div className="card h-fit">
          <h3 className="mb-3 font-bold">Dəstəklənən formatlar</h3>
          <div className="space-y-3 text-sm text-slate-500">
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-200">1. Cədvəl</p>
              <p className="text-xs">Sual | A | B | C | D | Düzgün Cavab sütunları.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-200">2. Tək-xana (universitet)</p>
              <p className="text-xs">Sual + variantlar bir xanada, cavab yan sütunda (D, B…).</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-200">3. Blok</p>
              <p className="text-xs">Nömrələnmiş suallar, A) B) C) sətirləri, "Düzgün Cavab: D".</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-200">4. PDF (universitet)</p>
              <p className="text-xs">
                Nömrələnmiş suallar, • variantlar, düzgün cavabda <b>√</b> işarəsi.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-brand-50 p-3 text-xs text-brand-800 dark:bg-brand-950/40 dark:text-brand-200">
            🤖 Sistem formatı avtomatik tanıyır. Metadata (universitet adı, fənn,
            il), birləşdirilmiş xanalar və dinamik variant sayı (2–6+) dəstəklənir.
            "Mövzu", "Çətinlik", "İzah" sütunları varsa avtomatik götürülür.
          </div>
        </div>
      </div>
    </div>
  );
}

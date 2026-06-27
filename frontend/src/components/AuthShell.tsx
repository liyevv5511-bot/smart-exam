import { ReactNode, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, CheckCircle2, Star } from 'lucide-react';
import { api } from '../api/client';
import { Avatar } from './Avatar';

const perks = [
  'Excel/PDF-dən avtomatik imtahan yaradılması',
  'Offline rejimdə imtahan həlli',
  'Yalnız səhv sualları təkrar edin',
  'Detallı statistika və irəliləyiş analitikası',
];

interface Review {
  rating: number;
  comment: string;
  full_name: string;
  avatar_url?: string | null;
}

function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= n ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
        />
      ))}
    </span>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<{ count: number; avg: number } | null>(null);

  useEffect(() => {
    api
      .get('/reviews/public')
      .then((r) => {
        setReviews(r.data.reviews);
        setStats(r.data.stats);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Sol — brend paneli */}
      <div className="relative hidden overflow-hidden bg-brand-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 h-80 w-80 rounded-full bg-brand-900/50 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur">
            <GraduationCap size={24} />
          </div>
          <span className="text-lg font-bold">Ağıllı İmtahan Sistemi</span>
        </div>
        <div className="relative">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 text-3xl font-extrabold leading-tight"
          >
            Daha ağıllı oxu,<br /> daha sürətli inkişaf et.
          </motion.h2>
          <ul className="space-y-3">
            {perks.map((p, i) => (
              <motion.li
                key={p}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="flex items-center gap-3 text-brand-50"
              >
                <CheckCircle2 size={20} className="shrink-0 text-brand-200" />
                {p}
              </motion.li>
            ))}
          </ul>

          {/* Rəylər (desktop) */}
          {reviews.length > 0 && (
            <div className="mt-8 rounded-2xl bg-white/10 p-4 backdrop-blur">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Stars n={Math.round(stats?.avg || 0)} />
                <span>{stats?.avg}</span>
                <span className="text-brand-200">· {stats?.count} rəy</span>
              </div>
              <div className="space-y-3">
                {reviews.slice(0, 2).map((r, i) => (
                  <div key={i} className="flex gap-3">
                    <Avatar url={r.avatar_url} name={r.full_name} size={36} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{r.full_name}</p>
                      <p className="line-clamp-2 text-xs text-brand-100">{r.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <p className="relative text-sm text-brand-200">
          © {new Date().getFullYear()} Ağıllı İmtahan Sistemi
        </p>
      </div>

      {/* Sağ — forma */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          {children}
        </motion.div>

        {/* Rəylər (mobil — sol panel gizli olduğu üçün) */}
        {reviews.length > 0 && (
          <div className="mt-8 w-full max-w-sm lg:hidden">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <Stars n={Math.round(stats?.avg || 0)} />
              <span>{stats?.avg}</span>
              <span className="text-slate-400">· {stats?.count} rəy</span>
            </div>
            <div className="space-y-2">
              {reviews.slice(0, 3).map((r, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                >
                  <Avatar url={r.avatar_url} name={r.full_name} size={34} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{r.full_name}</p>
                      <Stars n={r.rating} size={11} />
                    </div>
                    <p className="line-clamp-2 text-xs text-slate-500">{r.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

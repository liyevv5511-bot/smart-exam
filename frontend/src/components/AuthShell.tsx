import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, CheckCircle2 } from 'lucide-react';

const perks = [
  'Excel-dən avtomatik imtahan yaradılması',
  'Sualların və variantların təsadüfiləşdirilməsi',
  'Yalnız səhv sualları təkrar edin',
  'Detallı statistika və irəliləyiş analitikası',
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
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
        </div>
        <p className="relative text-sm text-brand-200">
          © {new Date().getFullYear()} Ağıllı İmtahan Sistemi
        </p>
      </div>

      {/* Sağ — forma */}
      <div className="flex items-center justify-center p-6 sm:p-12">
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
      </div>
    </div>
  );
}

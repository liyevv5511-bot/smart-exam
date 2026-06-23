import { motion } from 'framer-motion';

export function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  suffix,
  delay = 0,
}: {
  icon: any;
  label: string;
  value: string | number;
  accent: string;
  suffix?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card flex items-center gap-4"
    >
      <div className={`grid h-12 w-12 place-items-center rounded-xl ${accent}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-slate-400">{label}</p>
        <p className="text-2xl font-extrabold">
          {value}
          {suffix && <span className="text-base font-semibold text-slate-400">{suffix}</span>}
        </p>
      </div>
    </motion.div>
  );
}

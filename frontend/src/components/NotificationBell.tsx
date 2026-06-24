import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check } from 'lucide-react';
import { api } from '../api/client';

interface Notif {
  id: string;
  title: string;
  body?: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = () =>
    api.get('/notifications').then((r) => setItems(r.data.notifications)).catch(() => {});

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // hər 30 san yenilə
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => {
      clearInterval(t);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  const unread = items.filter((n) => !n.is_read).length;

  const markAll = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    setItems((xs) => xs.map((x) => ({ ...x, is_read: true })));
  };

  const openOne = async (n: Notif) => {
    if (!n.is_read) {
      await api.patch(`/notifications/${n.id}/read`).catch(() => {});
      setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        title="Bildirişlər"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
              <p className="text-sm font-bold">Bildirişlər</p>
              {unread > 0 && (
                <button onClick={markAll} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                  <Check size={12} /> Hamısını oxu
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {!items.length ? (
                <p className="py-8 text-center text-sm text-slate-400">Bildiriş yoxdur.</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => openOne(n)}
                    className={`block w-full border-b border-slate-50 px-4 py-3 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/40 ${
                      !n.is_read ? 'bg-brand-50/50 dark:bg-brand-950/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                      <div className={n.is_read ? 'pl-4' : ''}>
                        <p className="text-sm font-semibold">{n.title}</p>
                        {n.body && <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>}
                        <p className="mt-1 text-[10px] text-slate-400">
                          {new Date(n.created_at).toLocaleString('az')}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

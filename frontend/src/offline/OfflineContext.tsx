import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import toast from 'react-hot-toast';
import { listPending } from './db';
import { syncPending } from './sync';

interface OfflineCtx {
  online: boolean;
  pendingCount: number;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const Ctx = createContext<OfflineCtx>(null as any);
export const useOffline = () => useContext(Ctx);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(async () => {
    setPendingCount((await listPending()).length);
  }, []);

  const syncNow = useCallback(async () => {
    const n = await syncPending();
    await refresh();
    if (n > 0) toast.success(`${n} offline nəticə sinxronlaşdırıldı.`);
  }, [refresh]);

  useEffect(() => {
    refresh();
    // online olanda avtomatik sinxronlaşdır
    syncNow();

    const onOnline = () => {
      setOnline(true);
      syncNow();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refresh, syncNow]);

  return (
    <Ctx.Provider value={{ online, pendingCount, refresh, syncNow }}>{children}</Ctx.Provider>
  );
}

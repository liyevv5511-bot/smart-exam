import { api } from '../api/client';
import { listPending, removePending } from './db';

/** Sinxronlaşmamış offline nəticələri serverə göndərir. Sinxronlaşan sayı qaytarır. */
export async function syncPending(): Promise<number> {
  if (!navigator.onLine) return 0;
  const pending = await listPending();
  let synced = 0;
  for (const p of pending) {
    try {
      await api.post('/exams/sync', {
        testId: p.testId,
        mode: p.mode,
        practice: p.practice,
        startedAt: p.startedAt,
        answers: p.answers,
      });
      await removePending(p.localId);
      synced++;
    } catch {
      // uğursuz olsa qalsın — növbəti dəfə yenidən cəhd ediləcək
    }
  }
  return synced;
}

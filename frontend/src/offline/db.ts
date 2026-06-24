import { get, set, del, keys } from 'idb-keyval';

// ---- Endirilmiş testlər (offline üçün) ----
export interface OfflineQuestion {
  id: string;
  position: number;
  text: string;
  options: string[];
  option_count: number;
  correct_index: number;
  explanation?: string;
  topic?: string;
}
export interface OfflineTest {
  test: { id: string; title: string; question_count: number };
  questions: OfflineQuestion[];
  downloadedAt: string;
}

const TEST_PREFIX = 'test:';

export async function saveOfflineTest(t: OfflineTest) {
  await set(TEST_PREFIX + t.test.id, t);
}
export async function getOfflineTest(id: string): Promise<OfflineTest | undefined> {
  return get(TEST_PREFIX + id);
}
export async function removeOfflineTest(id: string) {
  await del(TEST_PREFIX + id);
}
export async function listOfflineTestIds(): Promise<string[]> {
  const ks = await keys();
  return ks
    .filter((k): k is string => typeof k === 'string' && k.startsWith(TEST_PREFIX))
    .map((k) => k.slice(TEST_PREFIX.length));
}

// ---- Sinxronlaşmamış nəticələr ----
export interface PendingResult {
  localId: string;
  testId: string;
  testTitle: string;
  mode: string;
  practice?: boolean;
  startedAt: string;
  answers: { questionId: string; originalIndex: number | null }[];
  // yerli hesablanmış xülasə (göstərmək üçün)
  summary: { total: number; correct: number; wrong: number; unanswered: number; score: number };
}

const PENDING_KEY = 'pendingResults';

export async function listPending(): Promise<PendingResult[]> {
  return (await get(PENDING_KEY)) || [];
}
export async function addPending(r: PendingResult) {
  const list = await listPending();
  list.push(r);
  await set(PENDING_KEY, list);
}
export async function removePending(localId: string) {
  const list = await listPending();
  await set(
    PENDING_KEY,
    list.filter((x) => x.localId !== localId)
  );
}

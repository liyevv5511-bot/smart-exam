// Pulsuz tərcümə (açar tələb etmir). Mənbə dili avtomatik aşkarlanır.
// Google-un açıq "translate_a" uç nöqtəsindən istifadə edir, serverdə (CORS yox).

const cache = new Map<string, string>();
const MAX_CACHE = 8000;

export async function translateText(text: string, target: string): Promise<string> {
  const t = (text || '').trim();
  if (!t) return text;
  const key = `${target}::${t}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  try {
    const url =
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
        target
      )}&dt=t&q=${encodeURIComponent(t)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data: any = await res.json();
    // data[0] = [[tərcümə, orijinal, ...], ...]
    const translated = Array.isArray(data?.[0])
      ? data[0].map((seg: any) => (seg && seg[0]) || '').join('')
      : t;
    if (cache.size > MAX_CACHE) cache.clear();
    cache.set(key, translated);
    return translated;
  } catch {
    return text; // xəta olarsa orijinalı qaytar
  }
}

/** Bir neçə mətni eyni vaxtda tərcümə edir. */
export async function translateMany(texts: string[], target: string): Promise<string[]> {
  return Promise.all(texts.map((t) => translateText(t, target)));
}

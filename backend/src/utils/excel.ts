import * as XLSX from 'xlsx';

export interface ParsedQuestion {
  position: number;
  text: string;
  options: string[]; // dinamik: 2, 3, 4, 5, 6+ variant
  correctIndex: number; // 0-dan
  explanation?: string;
  difficulty?: string;
  reference?: string;
  topic?: string;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  errors: string[];
  warnings: string[];
  strategy: 'tabular' | 'blocks' | 'embedded' | 'none';
}

// ============================================================
//  KÖMƏKÇİLƏR
// ============================================================
function norm(s: any): string {
  return String(s ?? '').trim().toLowerCase();
}

/** "A"/"B"/... və ya "Variant C", "Option D", "Cavab E" başlığını hərfə çevirir. */
function headerToOptionLetter(h: string): string | null {
  const n = norm(h);
  if (/^[a-z]$/i.test(n)) return n.toUpperCase();
  const m = n.match(/^(?:variant|option|cavab|seçim|secim)\s+([a-z])$/i);
  return m ? m[1].toUpperCase() : null;
}

/** Düzgün cavab xanasını indeksə çevirir (hərf və ya 1-əsaslı nömrə). */
function correctToIndex(v: any, optionCount: number): number | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const letter = s.match(/[A-Za-z]/);
  if (/^[A-Za-z]$/.test(s) || (letter && s.length <= 3)) {
    const idx = letter![0].toUpperCase().charCodeAt(0) - 65;
    return idx >= 0 && idx < optionCount ? idx : null;
  }
  if (/^\d+$/.test(s)) {
    const idx = parseInt(s, 10) - 1;
    return idx >= 0 && idx < optionCount ? idx : null;
  }
  return null;
}

// ============================================================
//  STRATEGİYA 1 — CƏDVƏL DÜZÜLÜŞÜ (başlıq sətri + sütunlar)
// ============================================================
const TEXT_ALIASES = ['sual', 'question', 'sual mətni', 'suallar', 'sual metni'];
const CORRECT_ALIASES = [
  'düzgün cavab', 'duzgun cavab', 'dogru cavab', 'doğru cavab',
  'correct', 'correct answer', 'cavab', 'answer', 'key', 'açar',
];
const EXPL_ALIASES = ['izah', 'explanation', 'açıqlama', 'aciqlama', 'şərh', 'serh'];
const DIFF_ALIASES = ['çətinlik', 'cetinlik', 'difficulty', 'səviyyə', 'seviyye'];
const REF_ALIASES = ['ədəbiyyat', 'edebiyyat', 'istinad', 'literature', 'reference', 'mənbə', 'menbe', 'qaynaq'];
const TOPIC_ALIASES = ['mövzu', 'movzu', 'mövzü', 'topic', 'bölmə', 'bolme', 'fəsil', 'fesil', 'section', 'kateqoriya'];

function parseTabular(rows: any[][]): ParseResult | null {
  const warnings: string[] = [];
  // İlk 15 sətirdən birində uyğun başlıq tap (metadata sətirlərini keç)
  let headerRow = -1;
  let cols: any = null;
  for (let h = 0; h < Math.min(rows.length, 15); h++) {
    const headers = rows[h].map((c) => c);
    const textCol = headers.findIndex((c: any) => TEXT_ALIASES.includes(norm(c)));
    const correctCol = headers.findIndex((c: any) => CORRECT_ALIASES.includes(norm(c)));
    const optionCols: { idx: number; letter: string }[] = [];
    const explCol = headers.findIndex((c: any) => EXPL_ALIASES.includes(norm(c)));
    const diffCol = headers.findIndex((c: any) => DIFF_ALIASES.includes(norm(c)));
    const refCol = headers.findIndex((c: any) => REF_ALIASES.includes(norm(c)));
    const topicCol = headers.findIndex((c: any) => TOPIC_ALIASES.includes(norm(c)));
    headers.forEach((c: any, idx: number) => {
      if ([textCol, correctCol, explCol, diffCol, refCol, topicCol].includes(idx)) return;
      const letter = headerToOptionLetter(c);
      if (letter) optionCols.push({ idx, letter });
    });
    optionCols.sort((a, b) => a.letter.localeCompare(b.letter));
    if (textCol !== -1 && correctCol !== -1 && optionCols.length >= 2) {
      headerRow = h;
      cols = { textCol, correctCol, explCol, diffCol, refCol, topicCol, optionCols };
      break;
    }
  }
  if (headerRow === -1) return null; // cədvəl başlığı tapılmadı → blok strategiyasına keç

  const questions: ParsedQuestion[] = [];
  let pos = 0;
  for (let i = headerRow + 1; i < rows.length; i++) {
    const r = rows[i];
    const text = String(r[cols.textCol] ?? '').trim();
    if (!text) continue;
    const rawOptions = cols.optionCols.map((c: any) => String(r[c.idx] ?? '').trim());
    while (rawOptions.length && rawOptions[rawOptions.length - 1] === '') rawOptions.pop();
    if (rawOptions.length < 2 || rawOptions.some((o: string) => o === '')) {
      warnings.push(`Sətir ${i + 1}: variant problemi — buraxıldı.`);
      continue;
    }
    const correctIndex = correctToIndex(r[cols.correctCol], rawOptions.length);
    if (correctIndex === null) {
      warnings.push(`Sətir ${i + 1}: düzgün cavab tapılmadı — buraxıldı.`);
      continue;
    }
    pos++;
    questions.push({
      position: pos,
      text,
      options: rawOptions,
      correctIndex,
      explanation: cols.explCol !== -1 ? String(r[cols.explCol] ?? '').trim() || undefined : undefined,
      difficulty: cols.diffCol !== -1 ? String(r[cols.diffCol] ?? '').trim() || undefined : undefined,
      reference: cols.refCol !== -1 ? String(r[cols.refCol] ?? '').trim() || undefined : undefined,
      topic: cols.topicCol !== -1 ? String(r[cols.topicCol] ?? '').trim() || undefined : undefined,
    });
  }
  return { questions, errors: [], warnings, strategy: 'tabular' };
}

// ============================================================
//  STRATEGİYA 2 — BLOK DÜZÜLÜŞÜ (ağıllı pattern aşkarlama)
//  Universitet faylları: metadata başlıqları + nömrələnmiş suallar
//  + "A) ...", "B) ..." variantları + "Düzgün Cavab: D"
// ============================================================

// Sətirdəki bütün dolu xanaları bir mətn sətrinə birləşdirir
function rowToLine(r: any[]): string {
  return r.map((c) => String(c ?? '').trim()).filter(Boolean).join('  ').trim();
}

const RE_NUM_ONLY = /^\s*(\d{1,4})\s*[.)\-]?\s*$/;                 // "1"  "1."  "1)"
const RE_NUM_TEXT = /^\s*(\d{1,4})\s*[.)\-]\s+(.{3,})$/;            // "1. Sual mətni..."
const RE_OPTION   = /^\s*([A-Ja-j])\s*[).\-•]\s*(.+)$/;            // "A) ..."  "B. ..."  "C- ..."
const RE_CORRECT  = /^\s*(?:düzgün\s*cavab|do[ğg]ru\s*cavab|correct(?:\s*answer)?|cavab|key|açar)\s*[:.\-]?\s*([A-Ja-j])\s*$/i;
const RE_DIFF     = /^\s*(?:çətinlik|cetinlik|difficulty|səviyyə|seviyye)\s*[:.\-]?\s*(.+)$/i;
const RE_REF      = /^\s*(?:ədəbiyyat|edebiyyat|istinad|literature|reference|mənbə|menbe|qaynaq)\s*[:.\-]?\s*(.+)$/i;
const RE_TOPIC    = /^\s*(?:mövzu|movzu|mövzü|topic|bölmə|bolme|fəsil|fesil|section|kateqoriya)\s*[:.\-]?\s*(.+)$/i;

const letterIdx = (l: string) => l.toUpperCase().charCodeAt(0) - 65;

function parseBlocks(rows: any[][]): ParseResult {
  const warnings: string[] = [];
  const lines = rows.map(rowToLine).filter((l) => l.length > 0);

  type Q = {
    text: string[];
    options: string[];
    correct: number | null;
    difficulty?: string;
    reference?: string;
    topic?: string;
  };
  const out: ParsedQuestion[] = [];
  let q: Q | null = null;
  let buf: string[] = []; // növbəti sualın mətni üçün bufer
  let pos = 0;

  const makeQ = (textLines: string[]): Q => ({
    text: textLines.filter(Boolean),
    options: [],
    correct: null,
  });

  const finalize = (cur: Q | null) => {
    if (!cur) return;
    if (cur.options.length >= 2 && cur.correct !== null && cur.correct < cur.options.length) {
      pos++;
      out.push({
        position: pos,
        text: cur.text.join(' ').replace(/\s+/g, ' ').trim(),
        options: cur.options,
        correctIndex: cur.correct,
        difficulty: cur.difficulty,
        reference: cur.reference,
        topic: cur.topic,
      });
    } else if (cur.options.length >= 2 && cur.correct === null) {
      warnings.push(
        `Sual "${(cur.text[0] || '').slice(0, 40)}…": düzgün cavab tapılmadı — buraxıldı.`
      );
    }
  };

  for (const line of lines) {
    // --- Düzgün cavab ---
    const mc = line.match(RE_CORRECT);
    if (mc && q && q.options.length > 0) {
      q.correct = letterIdx(mc[1]);
      continue;
    }
    // --- Çətinlik / İstinad ---
    const md = line.match(RE_DIFF);
    if (md && q) { q.difficulty = md[1].trim(); continue; }
    const mr = line.match(RE_REF);
    if (mr && q) { q.reference = mr[1].trim(); continue; }
    const mt = line.match(RE_TOPIC);
    if (mt && q && q.options.length === 0) { q.topic = mt[1].trim(); continue; }

    // --- Variant sətri (A) ...) ---
    const mo = line.match(RE_OPTION);
    if (mo) {
      const idx = letterIdx(mo[1]);
      const optText = mo[2].trim();
      if (q && q.options.length > 0 && idx === 0) {
        // yeni sual başlayır (A) ilə) — əvvəlkini bağla, bufer = sual mətni
        finalize(q);
        q = makeQ(buf);
      } else if (!q) {
        q = makeQ(buf);
      }
      q.options.push(optText);
      buf = [];
      continue;
    }

    // --- Sual nömrəsi (yalnız nömrə) ---
    if (RE_NUM_ONLY.test(line)) {
      finalize(q);
      q = null;
      buf = [];
      continue; // mətn növbəti sətirlərdə gələcək
    }
    // --- "1. Sual mətni" ---
    const mnText = line.match(RE_NUM_TEXT);
    if (mnText) {
      finalize(q);
      q = null;
      buf = [mnText[2].trim()];
      continue;
    }

    // --- Adi mətn sətri ---
    if (q && q.options.length > 0) {
      // variantlardan sonrakı sərbəst mətn → növbəti sual mətni kimi qəbul et
      finalize(q);
      q = null;
      buf = [line];
    } else if (q && q.options.length === 0) {
      q.text.push(line); // sual mətninin davamı
    } else {
      buf.push(line); // metadata və ya sual mətni bufer
    }
  }
  finalize(q);

  return { questions: out, errors: [], warnings, strategy: 'blocks' };
}

// ============================================================
//  STRATEGİYA 3 — TƏK XANA (embedded) DÜZÜLÜŞÜ
//  Real universitet faylları: sual mətni + bütün variantlar BİR xanada
//  (sətir keçidləri ilə), düzgün cavab isə qonşu sütunda tək hərflə.
//      | 1 | "Sual?\nA) ...\nB) ...\nC) ..." | D |  ...boş sütunlar... |
// ============================================================
const RE_OPT_LINE = /^\s*([A-Ja-j])\s*[).\-•]\s*(.+)$/;

/** Xananı sətirlərə böl — newline yoxdursa variant markerlərindən əvvəl bölür. */
function questionLines(cell: string): string[] {
  let lines = cell.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const optCount = lines.filter((l) => RE_OPT_LINE.test(l)).length;
  if (optCount >= 2) return lines;
  // Sətir keçidi yoxdur → " A) ", " B) " markerlərindən əvvəl böl
  const broken = cell.replace(/\s+(?=[A-Ja-j]\)\s)/g, '\n');
  return broken.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

function countOptionLines(cell: string): number {
  return questionLines(cell).filter((l) => RE_OPT_LINE.test(l)).length;
}

/** Tək xanadan sual mətni + variantları (+ varsa daxili düzgün cavab) çıxarır. */
function parseQuestionCell(cell: string): {
  text: string;
  options: string[];
  inlineCorrect: number | null;
  difficulty?: string;
  reference?: string;
  topic?: string;
} {
  const lines = questionLines(cell);
  const textLines: string[] = [];
  const options: string[] = [];
  let inlineCorrect: number | null = null;
  let difficulty: string | undefined;
  let reference: string | undefined;
  let topic: string | undefined;
  let started = false;

  for (const line of lines) {
    const mc = line.match(RE_CORRECT);
    if (mc && options.length > 0) {
      inlineCorrect = letterIdx(mc[1]);
      continue;
    }
    const md = line.match(RE_DIFF);
    if (md) { difficulty = md[1].trim(); continue; }
    const mr = line.match(RE_REF);
    if (mr) { reference = mr[1].trim(); continue; }
    const mt = line.match(RE_TOPIC);
    if (mt && !started) { topic = mt[1].trim(); continue; }

    const mo = line.match(RE_OPT_LINE);
    if (mo) {
      options.push(mo[2].trim());
      started = true;
      continue;
    }
    if (!started) textLines.push(line);
    else if (options.length) options[options.length - 1] += ' ' + line; // sətirə sığmayan variant
  }
  return {
    text: textLines.join(' ').replace(/\s+/g, ' ').trim(),
    options,
    inlineCorrect,
    difficulty,
    reference,
    topic,
  };
}

/** Qonşu xanadakı tək hərfli düzgün cavabı indeksə çevirir ("D", "D)", "D." da). */
function letterCell(v: any): number | null {
  const s = String(v ?? '').trim();
  return /^[A-Ja-j][).]?$/.test(s) ? letterIdx(s[0]) : null;
}

function parseEmbedded(rows: any[][]): ParseResult {
  const warnings: string[] = [];
  const out: ParsedQuestion[] = [];
  let pos = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    // Sual+variant xanasını tap (≥2 variant sətri olan)
    let richIdx = -1;
    for (let c = 0; c < r.length; c++) {
      if (countOptionLines(String(r[c] ?? '')) >= 2) {
        richIdx = c;
        break;
      }
    }
    if (richIdx === -1) continue;

    const { text, options, inlineCorrect, difficulty, reference, topic } = parseQuestionCell(
      String(r[richIdx])
    );
    if (options.length < 2 || !text) continue;

    // Düzgün cavab: daxili → yoxdursa qonşu sütunlar (əvvəl sağ, sonra sol)
    let correct = inlineCorrect;
    if (correct === null) {
      for (let c = richIdx + 1; c < r.length && correct === null; c++) correct = letterCell(r[c]);
      for (let c = richIdx - 1; c >= 0 && correct === null; c--) correct = letterCell(r[c]);
    }
    if (correct === null || correct >= options.length) {
      warnings.push(`Sual ${i + 1}: düzgün cavab tapılmadı/uyğunsuz — buraxıldı.`);
      continue;
    }

    pos++;
    out.push({ position: pos, text, options, correctIndex: correct, difficulty, reference, topic });
  }

  return { questions: out, errors: [], warnings, strategy: 'embedded' };
}

// ============================================================
//  ƏSAS GİRİŞ — ağıllı strategiya seçimi
// ============================================================
export function parseExcel(buffer: Buffer): ParseResult {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: 'buffer' });
  } catch {
    return { questions: [], errors: ['Fayl oxuna bilmədi. Düzgün .xlsx/.xls faylı yükləyin.'], warnings: [], strategy: 'none' };
  }

  // Bütün vərəqləri yoxla, ən çox sual verən nəticəni seç
  let best: ParseResult = { questions: [], errors: [], warnings: [], strategy: 'none' };
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
    if (!rows.length) continue;

    // 1) Cədvəl strategiyası (başlıq sətri + sütunlar)
    const tab = parseTabular(rows);
    if (tab && tab.questions.length > best.questions.length) best = tab;

    // 2) Tək-xana (embedded): sual+variantlar bir xanada, cavab qonşu sütunda
    const emb = parseEmbedded(rows);
    if (emb.questions.length > best.questions.length) best = emb;

    // 3) Blok düzülüşü (hər element ayrı sətirdə)
    const blk = parseBlocks(rows);
    if (blk.questions.length > best.questions.length) best = blk;
  }

  if (!best.questions.length) {
    best.errors.push(
      'Heç bir sual aşkarlanmadı. Faylda nömrələnmiş suallar, A/B/C/D variantları və düzgün cavab olmalıdır.'
    );
    best.strategy = 'none';
  }
  return best;
}

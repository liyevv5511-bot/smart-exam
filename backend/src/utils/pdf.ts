import pdfParse from 'pdf-parse';
import type { ParsedQuestion, ParseResult } from './excel';

/**
 * PDF imtahan faylını oxuyur. Dəstəklənən format (universitet üslubu):
 *
 *   1.   Sual mətni?
 *        •  Variant 1
 *        √  Düzgün variant      ← √ / ✓ işarəsi = düzgün cavab
 *        •  Variant 3
 *        •  Variant 4
 *   2.   Növbəti sual?
 *        ...
 *
 * Həmçinin "A) ..." variantları və "Düzgün Cavab: X" sətri də dəstəklənir.
 */

// Düzgün cavabı bildirən işarələr
const CORRECT_MARKERS = new Set(['√', '✓', '✔', '✅', '☑', '*']);
// Adi variant işarələri
const BULLET_MARKERS = new Set([
  '•', '◦', '▪', '‣', '·', '●', '○', '-', '–', '—', '∙', 'o',
]);

const RE_QNUM = /^\s*(\d{1,4})\s*[.)]\s*(.*)$/; // "1." və ya "1)" + qalan mətn
const RE_LETTER_OPT = /^\s*([A-Ja-j])\s*[).]\s*(.+)$/; // "A) ..."
const RE_CORRECT_LINE =
  /^\s*(?:düzgün\s*cavab|do[ğg]ru\s*cavab|correct(?:\s*answer)?|cavab|key)\s*[:.\-]?\s*([A-Ja-j])\s*$/i;

const letterIdx = (l: string) => l.toUpperCase().charCodeAt(0) - 65;

/** Sətrin əvvəlindəki işarəni təhlil edir: variant + düzgünmü? */
function parseBullet(line: string): { text: string; correct: boolean } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const ch = [...trimmed][0]; // ilk Unicode simvol
  if (CORRECT_MARKERS.has(ch)) {
    const rest = trimmed.slice(ch.length).trim();
    if (rest) return { text: rest, correct: true };
  }
  if (BULLET_MARKERS.has(ch)) {
    const rest = trimmed.slice(ch.length).trim();
    if (rest) return { text: rest, correct: false };
  }
  return null;
}

interface WorkQ {
  textLines: string[];
  options: string[];
  correctIdx: number | null;
}

/** Çıxarılmış mətndən sualları tanıyır (saf funksiya — test üçün də əlçatandır). */
export function parseQuestionsFromText(text: string): {
  questions: ParsedQuestion[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const questions: ParsedQuestion[] = [];
  let cur: WorkQ | null = null;
  let pos = 0;
  // Bəzi PDF-lərdə √ tək sətirdə olur, düzgün cavab növbəti sətirdədir
  let pendingCorrect = false;

  const isLoneCorrectMark = (t: string) =>
    t.length > 0 && t.length <= 2 && [...t].every((c) => CORRECT_MARKERS.has(c));

  const flush = () => {
    if (!cur) return;
    if (cur.options.length >= 2 && cur.correctIdx !== null && cur.correctIdx < cur.options.length) {
      pos++;
      questions.push({
        position: pos,
        text: cur.textLines.join(' ').replace(/\s+/g, ' ').trim(),
        options: cur.options,
        correctIndex: cur.correctIdx,
      });
    } else if (cur.options.length >= 2 && cur.correctIdx === null) {
      warnings.push(
        `Sual "${(cur.textLines[0] || '').slice(0, 40)}…": düzgün cavab (√) tapılmadı — buraxıldı.`
      );
    }
    cur = null;
  };

  for (const line of lines) {
    const t = line.trim();

    // --- Tək sətirdə √ işarəsi → növbəti variant düzgündür ---
    if (cur && isLoneCorrectMark(t)) {
      pendingCorrect = true;
      continue;
    }

    // --- Yeni sual nömrəsi ---
    const qn = RE_QNUM.exec(line);
    if (qn && (!cur || cur.options.length > 0)) {
      flush();
      cur = { textLines: qn[2] ? [qn[2].trim()] : [], options: [], correctIdx: null };
      pendingCorrect = false;
      continue;
    }
    if (!cur) continue; // ilk sualdan əvvəlki metadata — keç

    // --- İşarəli variant (• / √) ---
    const bullet = parseBullet(line);
    if (bullet) {
      if (bullet.correct || pendingCorrect) cur.correctIdx = cur.options.length;
      cur.options.push(bullet.text);
      pendingCorrect = false;
      continue;
    }

    // --- "A) ..." variantı ---
    const lo = RE_LETTER_OPT.exec(line);
    if (lo) {
      if (pendingCorrect) cur.correctIdx = cur.options.length;
      cur.options.push(lo[2].trim());
      pendingCorrect = false;
      continue;
    }

    // --- "Düzgün Cavab: X" sətri ---
    const cl = RE_CORRECT_LINE.exec(line);
    if (cl && cur.options.length > 0) {
      cur.correctIdx = letterIdx(cl[1]);
      continue;
    }

    // --- Adi mətn ---
    if (pendingCorrect) {
      // əvvəlki sətir tək √ idi → bu sətir düzgün variantdır (işarəsiz)
      cur.correctIdx = cur.options.length;
      cur.options.push(t);
      pendingCorrect = false;
    } else if (cur.options.length === 0) {
      cur.textLines.push(line); // sualın davamı
    } else {
      cur.options[cur.options.length - 1] += ' ' + line; // variantın davamı (sətirə sığmayıb)
    }
  }
  flush();

  return { questions, warnings };
}

/** PDF buffer → ParseResult */
export async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  let text = '';
  try {
    const data = await pdfParse(buffer);
    text = data.text || '';
  } catch {
    return {
      questions: [],
      errors: ['PDF oxuna bilmədi. Fayl zədəli ola bilər və ya skan (şəkil) PDF-dir.'],
      warnings: [],
      strategy: 'pdf',
    };
  }

  if (!text.trim()) {
    return {
      questions: [],
      errors: [
        'PDF-də mətn tapılmadı. Bu, şəkil/skan PDF ola bilər (mətn seçilmir) — OCR tələb olunur.',
      ],
      warnings: [],
      strategy: 'pdf',
    };
  }

  const { questions, warnings } = parseQuestionsFromText(text);
  const errors: string[] = [];
  if (!questions.length) {
    errors.push(
      'PDF-dən sual tanınmadı. Format: nömrələnmiş suallar, • variantlar və düzgün cavabda √ işarəsi olmalıdır.'
    );
  }
  return { questions, errors, warnings, strategy: 'pdf' };
}

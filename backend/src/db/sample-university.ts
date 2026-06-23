import * as XLSX from 'xlsx';
import path from 'path';

/**
 * REAL universitet üslublu nümunə (BLOK düzülüşü, sabit başlıq YOXDUR).
 * Metadata başlıqları + nömrələnmiş suallar + A) B) C) variantları + "Düzgün Cavab: X".
 * İşə salmaq:  npx tsx src/db/sample-university.ts
 */
const rows: any[][] = [];
const push = (...cells: any[]) => rows.push(cells);

// --- Metadata (təhlilçi bunları buraxmalıdır) ---
push('AZƏRBAYCAN DÖVLƏT UNİVERSİTETİ');
push('Fənn: Kompüter Elmləri');
push('Tədris ili: 2025-2026');
push('Fakültə: İnformasiya Texnologiyaları');
push('');
push(''); // boş sətirlər

// --- Suallar (blok formatı, fərqli variant sayları) ---
const blocks: { n: number; q: string; opts: string[]; correct: string; diff?: string; ref?: string }[] = [
  {
    n: 1,
    q: 'Fərqli və kompleks yanaşma prinsipi nəyi nəzərə alır?',
    opts: ['Yalnız sürəti', 'Yalnız yaddaşı', 'Yalnız qiyməti', 'Yalnız dizaynı', 'Bütün amilləri birlikdə'],
    correct: 'E',
    diff: 'Orta',
    ref: 'Dərslik, səh. 45',
  },
  {
    n: 2,
    q: 'HTML qısaltması nəyi bildirir?',
    opts: ['HyperText Markup Language', 'High Text Machine Language', 'Hyperlink Text Mode Language', 'Home Tool Markup Language'],
    correct: 'A',
  },
  {
    n: 3,
    q: 'İkilik say sistemində 1 + 1 neçə edir?',
    opts: ['2', '10', '11'],
    correct: 'B',
    diff: 'Asan',
  },
  {
    n: 4,
    q: 'Aşağıdakılardan hansı verilənlər bazası idarəetmə sistemidir?',
    opts: ['Photoshop', 'PostgreSQL', 'Excel'],
    correct: 'B',
  },
  {
    n: 5,
    q: 'Suyun qaynama temperaturu (normal təzyiqdə) neçə dərəcədir?',
    opts: ['50°C', '100°C'],
    correct: 'B',
    ref: 'Fizika, fəsil 3',
  },
];

for (const b of blocks) {
  push(String(b.n)); // yalnız nömrə sətri
  push(b.q); // sual mətni
  b.opts.forEach((o, i) => push(`${String.fromCharCode(65 + i)}) ${o}`)); // "A) ..."
  push(`Düzgün Cavab: ${b.correct}`);
  if (b.diff) push(`Çətinlik: ${b.diff}`);
  if (b.ref) push(`Ədəbiyyat: ${b.ref}`);
  push(''); // suallar arası boşluq
}

const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'İmtahan');
const out = path.join(__dirname, '../../universitet-nümunə.xlsx');
XLSX.writeFile(wb, out);
console.log('✅ Universitet üslublu nümunə yaradıldı:', out);

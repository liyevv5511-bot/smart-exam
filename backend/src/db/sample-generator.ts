import * as XLSX from 'xlsx';
import path from 'path';

/**
 * Nümunə Excel faylı yaradır — DİNAMİK variant sayı (2–6) ilə.
 * İşə salmaq:  npx tsx src/db/sample-generator.ts
 */

// Maksimum 6 variant sütunu (A–F). Bəzi suallar az variantdan istifadə edir.
const header = ['Sual', 'A', 'B', 'C', 'D', 'E', 'F', 'Düzgün Cavab', 'İzah'];
const rows: any[][] = [header];

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function makeRow(text: string, options: string[], correctIdx: number, expl: string) {
  const cells: any[] = [text];
  for (let i = 0; i < 6; i++) cells.push(options[i] ?? ''); // boş = həmin sualda yoxdur
  cells.push(LETTERS[correctIdx]); // düzgün cavab hərfi
  cells.push(expl);
  return cells;
}

// Müxtəlif variant sayı ilə nümunə suallar
const samples: [string, string[], number, string][] = [
  ['HTML nədir?', ['Proqramlaşdırma Dili', 'İşarələmə Dili', 'Brauzer', 'Verilənlər Bazası'], 1, 'HTML — HyperText Markup Language (işarələmə dili).'],
  ['Hansı JavaScript çərçivəsidir?', ['React', 'HTML', 'CSS', 'MySQL', 'Linux'], 0, 'React — JavaScript kitabxanası/çərçivəsidir.'],
  ['2 + 2 = ?', ['3', '4'], 1, 'Sadə toplama: 2+2=4.'],
  ['Suyun kimyəvi formulu?', ['CO2', 'H2O', 'O2'], 1, 'Su = H2O.'],
  ['Python nədir?', ['Proqramlaşdırma dili', 'İlan növü', 'Brauzer', 'Oyun', 'Antivirus', 'Şəbəkə protokolu'], 0, 'Python — proqramlaşdırma dilidir.'],
];

// Əsas nümunələr
samples.forEach((s) => rows.push(makeRow(...s)));

// Performans testi üçün əlavə suallar (cəmi ~500) — variant sayı 2–5 arası dəyişir
for (let i = 1; i <= 495; i++) {
  const n = 2 + (i % 4); // 2,3,4,5 variant
  const opts: string[] = [];
  const correct = i % n;
  for (let j = 0; j < n; j++) opts.push(`Variant ${LETTERS[j]} (#${i})`);
  rows.push(makeRow(`Nümunə sual #${i} — düzgün cavab ${LETTERS[correct]}?`, opts, correct, `İzah #${i}.`));
}

const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Suallar');
const out = path.join(__dirname, '../../nümunə-suallar.xlsx');
XLSX.writeFile(wb, out);
console.log(`✅ Nümunə fayl yaradıldı (${rows.length - 1} sual, dinamik variant):`, out);

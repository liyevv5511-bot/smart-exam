import * as XLSX from 'xlsx';
import path from 'path';

/**
 * REAL universitet formatı: | № | "Sual + A) B) C)..." (tək xana) | Düzgün hərf | ...boş sütunlar |
 * İşə salmaq:  npx tsx src/db/sample-embedded.ts
 */
type Q = { q: string; opts: string[]; correct: string };

const data: Q[] = [
  {
    q: 'Fərqli və kompleks yanaşma prinsipi nəyi nəzərdə tutur?',
    opts: [
      'MM tədbirlərinin bölgələrdə, şəhərlərdə planlaşdırılması',
      'MM tədbirlərinin ayrı-ayrı obyektlərin ölçülərini nəzərə alınmaqla planlaşdırılması',
      'MM tədbirlərinin bölgələrin iqtisadi xüsusiyyətləri nəzərə alınmaqla planlaşdırılması',
      'MM tədbirlərinin ayrı-ayrı bölgələrin, şəhərlərin, obyektlərin hərbi-strateji, iqtisadi xüsusiyyətləri nəzərə alınmaqla planlaşdırılması',
      'MM tədbirlərinin nizamlı şəkildə keçirilməsi',
    ],
    correct: 'D',
  },
  {
    q: 'Mülki müdafiə anlayışı ilk dəfə hansı şəxs tərəfindən irəli sürülüb?',
    opts: ['Henri Corc', 'Corc Sant-Pol', 'Milan Bondi', 'Albert Eynşteyn', 'Fridrix Engels'],
    correct: 'B',
  },
  {
    q: '“Mülki müdafiənin təmin edilməsi haqqında” Azərbaycan Respublikası Nazirlər Kabinetinin qərarı nə vaxt qüvvəyə minib?',
    opts: ['19.04.2006', '30.04.1992', '25.09.1998', '30.12.1997', '06.08.1993'],
    correct: 'C',
  },
  {
    q: '“Müasir müharibədə mülki əhalinin mühafizəsi” kitabının müəllifi kimdir?',
    opts: ['Corc Sant-Pol', 'Henri Corc', 'Milan Bondi', 'V. Lenin', 'U. Çörçill'],
    correct: 'B',
  },
  {
    q: 'Beynəlxalq Mülki Müdafiə Təşkilatının (BMMT) əsası nə vaxt qoyulub?',
    opts: ['1937', '1947', '1957', '1931', '1972'],
    correct: 'D',
  },
  {
    q: 'BMMT-nin Nizamnaməsi BMT Katibliyində nə vaxt qeydə alınıb?',
    opts: ['1958', '1966', '1968', '1970', '1972'],
    correct: 'B',
  },
  {
    q: 'Ümumdünya Mülki Müdafiə günü nə vaxt qeyd olunur?',
    opts: ['1 yanvar', '28 may', '1 mart', '9 may', '31 dekabr'],
    correct: 'C',
  },
];

const rows: any[][] = [];
data.forEach((d, i) => {
  // Sual + variantlar tək xanada, sətir keçidləri (\n) ilə
  const cell =
    d.q + '\n' + d.opts.map((o, k) => `${String.fromCharCode(65 + k)}) ${o}`).join('\n');
  // | № | sual-xanası | düzgün hərf | sonra boş qiymətləndirmə sütunları |
  rows.push([i + 1, cell, d.correct, '', '', '', '', '', '']);
});

const ws = XLSX.utils.aoa_to_sheet(rows);
// xanada sətir keçidlərinin görünməsi üçün wrapText (parsinqə təsir etmir)
Object.keys(ws).forEach((k) => {
  if (k[0] !== '!' && ws[k].v && String(ws[k].v).includes('\n')) {
    ws[k].s = { alignment: { wrapText: true, vertical: 'top' } };
  }
});
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Test');
const out = path.join(__dirname, '../../mulki-mudafie-nümunə.xlsx');
XLSX.writeFile(wb, out);
console.log(`✅ Tək-xana formatlı nümunə yaradıldı (${data.length} sual):`, out);

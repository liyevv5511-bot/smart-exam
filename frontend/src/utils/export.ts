import type { ReviewItem } from '../types';

/** Səhv sualları CSV (Excel-də açılır) kimi yüklə. */
export function exportReviewCSV(items: ReviewItem[], fileName = 'sehv-suallar') {
  const header = ['Sual', 'Sizin cavab', 'Düzgün cavab', 'İzah'];
  const rows = items.map((r) => [
    r.question,
    r.yourAnswerText ?? '(boş)',
    r.correctAnswerText,
    r.explanation ?? '',
  ]);
  const csv =
    '﻿' + // UTF-8 BOM (Azərbaycan hərfləri üçün)
    [header, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  download(blob, `${fileName}.csv`);
}

/** Cari səhifəni PDF kimi çap et (brauzerin "PDF olaraq saxla" funksiyası). */
export function exportPDF() {
  window.print();
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

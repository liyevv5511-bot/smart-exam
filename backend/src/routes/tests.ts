import { Router } from 'express';
import { pool, query } from '../db/pool';
import { authRequired, AuthedRequest } from '../middleware/auth';
import { uploadExcel } from '../middleware/upload';
import { parseExcel, ParseResult } from '../utils/excel';
import { parsePdf } from '../utils/pdf';

const router = Router();
router.use(authRequired);

/** Fayl növünə görə uyğun təhlilçini seçir (PDF → pdf, əks halda Excel). */
async function parseFile(file: Express.Multer.File): Promise<ParseResult> {
  const isPdf = /\.pdf$/i.test(file.originalname) || file.mimetype === 'application/pdf';
  return isPdf ? parsePdf(file.buffer) : parseExcel(file.buffer);
}

// ---------- Excel yükləmə → yeni test (sual bankı) ----------
router.post('/upload', (req: AuthedRequest, res) => {
  uploadExcel(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Fayl seçilməyib.' });

    const { questions, errors, warnings, strategy } = await parseFile(req.file);
    if (!questions.length) {
      return res.status(422).json({ error: 'Fayl təhlil edilə bilmədi.', details: errors });
    }

    const title =
      (req.body.title as string)?.trim() ||
      req.file.originalname.replace(/\.(xlsx|xls)$/i, '');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const t = await client.query(
        `INSERT INTO tests (owner_id, title, description, source_file, question_count)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [req.user!.sub, title, req.body.description || null, req.file.originalname, questions.length]
      );
      const testId = t.rows[0].id;

      // Böyük fayllar üçün hissə-hissə (chunked) toplu insert — 2000+ sualı problemsiz idarə edir
      const CHUNK = 500;
      for (let start = 0; start < questions.length; start += CHUNK) {
        const slice = questions.slice(start, start + CHUNK);
        const values: any[] = [];
        const placeholders: string[] = [];
        slice.forEach((q, i) => {
          const b = i * 10;
          placeholders.push(
            `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10})`
          );
          values.push(
            testId,
            q.position,
            q.text,
            JSON.stringify(q.options),
            q.options.length,
            q.correctIndex,
            q.explanation || null,
            q.difficulty || null,
            q.reference || null,
            q.topic || null
          );
        });
        await client.query(
          `INSERT INTO questions
             (test_id, position, text, options, option_count, correct_index, explanation, difficulty, reference_note, topic)
           VALUES ${placeholders.join(',')}`,
          values
        );
      }
      await client.query('COMMIT');
      res.status(201).json({
        test: { id: testId, title, question_count: questions.length },
        warnings,
        strategy, // 'tabular' | 'blocks' — necə aşkarlandığı
      });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(e);
      res.status(500).json({ error: 'Yükləmə zamanı xəta baş verdi.' });
    } finally {
      client.release();
    }
  });
});

// ---------- Yükləmədən ÖNCƏ önizləmə (bazaya yazmadan təhlil) ----------
router.post('/preview', (req: AuthedRequest, res) => {
  uploadExcel(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Fayl seçilməyib.' });

    const { questions, errors, warnings, strategy } = await parseFile(req.file);
    if (!questions.length) {
      return res.status(422).json({ error: 'Sual aşkarlanmadı.', details: errors });
    }
    // Variant sayı paylanması və mövzular
    const topics = [...new Set(questions.map((q) => q.topic).filter(Boolean))];
    const optionDist: Record<number, number> = {};
    questions.forEach((q) => {
      optionDist[q.options.length] = (optionDist[q.options.length] || 0) + 1;
    });
    res.json({
      strategy,
      count: questions.length,
      warnings,
      topics,
      optionDistribution: optionDist,
      sample: questions.slice(0, 3).map((q) => ({
        position: q.position,
        text: q.text,
        options: q.options,
        correct: String.fromCharCode(65 + q.correctIndex),
        topic: q.topic,
      })),
    });
  });
});

// ---------- İstifadəçinin testləri ----------
router.get('/', async (req: AuthedRequest, res) => {
  const { rows } = await query(
    `SELECT id, title, description, source_file, question_count, created_at
     FROM tests WHERE owner_id=$1 ORDER BY created_at DESC`,
    [req.user!.sub]
  );
  res.json({ tests: rows });
});

// ---------- Tək test (suallarla, axtarış dəstəyi) ----------
router.get('/:id', async (req: AuthedRequest, res) => {
  const t = await query('SELECT * FROM tests WHERE id=$1 AND owner_id=$2', [
    req.params.id,
    req.user!.sub,
  ]);
  if (!t.rowCount) return res.status(404).json({ error: 'Test tapılmadı.' });

  const search = (req.query.q as string)?.trim();
  const qres = await query(
    `SELECT id, position, text, options, option_count, correct_index, explanation, difficulty, reference_note, topic
     FROM questions WHERE test_id=$1
     ${search ? 'AND text ILIKE $2' : ''}
     ORDER BY position`,
    search ? [req.params.id, `%${search}%`] : [req.params.id]
  );
  res.json({ test: t.rows[0], questions: qres.rows });
});

// ---------- Testin mövzuları (filtr üçün) ----------
router.get('/:id/topics', async (req: AuthedRequest, res) => {
  const t = await query('SELECT 1 FROM tests WHERE id=$1 AND owner_id=$2', [
    req.params.id,
    req.user!.sub,
  ]);
  if (!t.rowCount) return res.status(404).json({ error: 'Test tapılmadı.' });
  const { rows } = await query(
    `SELECT topic, COUNT(*)::int AS count FROM questions
     WHERE test_id=$1 AND topic IS NOT NULL AND topic <> ''
     GROUP BY topic ORDER BY topic`,
    [req.params.id]
  );
  res.json({ topics: rows });
});

// ---------- Sualı redaktə et (cavab açarı düzəlişi) ----------
router.patch('/:id/questions/:qid', async (req: AuthedRequest, res) => {
  const t = await query('SELECT 1 FROM tests WHERE id=$1 AND owner_id=$2', [
    req.params.id,
    req.user!.sub,
  ]);
  if (!t.rowCount) return res.status(404).json({ error: 'Test tapılmadı.' });

  const { text, options, correctIndex, explanation, topic, difficulty } = req.body;
  const fields: string[] = [];
  const vals: any[] = [];
  let n = 1;
  if (typeof text === 'string') { fields.push(`text=$${n++}`); vals.push(text.trim()); }
  if (Array.isArray(options) && options.length >= 2) {
    fields.push(`options=$${n++}`); vals.push(JSON.stringify(options));
    fields.push(`option_count=$${n++}`); vals.push(options.length);
  }
  if (Number.isInteger(correctIndex)) { fields.push(`correct_index=$${n++}`); vals.push(correctIndex); }
  if (text !== undefined) { /* noop */ }
  if (explanation !== undefined) { fields.push(`explanation=$${n++}`); vals.push(explanation || null); }
  if (topic !== undefined) { fields.push(`topic=$${n++}`); vals.push(topic || null); }
  if (difficulty !== undefined) { fields.push(`difficulty=$${n++}`); vals.push(difficulty || null); }
  if (!fields.length) return res.status(400).json({ error: 'Dəyişiklik yoxdur.' });

  vals.push(req.params.qid, req.params.id);
  const { rows } = await query(
    `UPDATE questions SET ${fields.join(', ')}
     WHERE id=$${n++} AND test_id=$${n}
     RETURNING id, position, text, options, option_count, correct_index, explanation, topic, difficulty`,
    vals
  );
  if (!rows[0]) return res.status(404).json({ error: 'Sual tapılmadı.' });
  // correct_index variant sayından böyük olmamalıdır
  if (rows[0].correct_index >= rows[0].option_count) {
    return res.status(400).json({ error: 'Düzgün cavab indeksi variant sayından böyükdür.' });
  }
  res.json({ question: rows[0] });
});

// ---------- Test silmə ----------
router.delete('/:id', async (req: AuthedRequest, res) => {
  const r = await query('DELETE FROM tests WHERE id=$1 AND owner_id=$2', [
    req.params.id,
    req.user!.sub,
  ]);
  if (!r.rowCount) return res.status(404).json({ error: 'Test tapılmadı.' });
  res.json({ message: 'Test silindi.' });
});

export default router;

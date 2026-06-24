import { Router } from 'express';
import { z } from 'zod';
import { pool, query } from '../db/pool';
import { authRequired, AuthedRequest } from '../middleware/auth';
import { shuffle } from '../utils/shuffle';
import { letterGrade } from '../utils/grade';

const router = Router();
router.use(authRequired);

/** İndeksi göstərilən hərfə çevirir: 0→A, 1→B, ... 25→Z, sonra AA, AB... */
function indexToLabel(i: number): string {
  let s = '';
  i += 1;
  while (i > 0) {
    const r = (i - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

/**
 * Sualı imtahan üçün hazırlayır: variantları qarışdırılmış sıraya görə düzür,
 * düzgün cavabı gizlədir. shuffledOrder = orijinal indekslərin permutasiyası.
 */
function publicQuestion(q: any, shuffledOrder: number[]) {
  const opts: string[] = q.options;
  const options = shuffledOrder.map((origIdx, displayIdx) => ({
    index: displayIdx, // göstərilən mövqe (cavab kimi bunu göndəririk)
    label: indexToLabel(displayIdx), // A, B, C, ...
    text: opts[origIdx],
  }));
  return {
    id: q.id,
    position: q.position,
    text: q.text,
    optionCount: options.length,
    options,
  };
}

// Toplu exam_answers insert (böyük imtahanlar üçün performanslı)
async function insertAnswers(
  client: any,
  sessionId: string,
  items: { questionId: string; shuffledOrder: number[] }[]
) {
  const CHUNK = 500;
  for (let start = 0; start < items.length; start += CHUNK) {
    const slice = items.slice(start, start + CHUNK);
    const values: any[] = [];
    const ph: string[] = [];
    slice.forEach((it, i) => {
      const b = i * 3;
      ph.push(`($${b + 1},$${b + 2},$${b + 3})`);
      values.push(sessionId, it.questionId, JSON.stringify(it.shuffledOrder));
    });
    await client.query(
      `INSERT INTO exam_answers (session_id, question_id, shuffled_order) VALUES ${ph.join(',')}`,
      values
    );
  }
}

// ---------- İmtahana başla ----------
const startSchema = z.object({
  testId: z.string().uuid(),
  mode: z.enum(['range', 'random', 'full']),
  from: z.number().int().positive().optional(),
  to: z.number().int().positive().optional(),
  count: z.number().int().positive().optional(),
  durationSec: z.number().int().positive().optional(),
  practice: z.boolean().optional(),
  topic: z.string().optional(),
});

router.post('/start', async (req: AuthedRequest, res) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { testId, mode, from, to, count, durationSec, practice, topic } = parsed.data;

  const test = await query('SELECT * FROM tests WHERE id=$1 AND owner_id=$2', [
    testId,
    req.user!.sub,
  ]);
  if (!test.rowCount) return res.status(404).json({ error: 'Test tapılmadı.' });
  const totalAvailable = test.rows[0].question_count;

  // Mövzu filtri (istəyə bağlı)
  const topicClause = topic ? ' AND topic = $TOPIC' : '';
  const withTopic = (sql: string, params: any[]) => {
    if (!topic) return { sql, params };
    return { sql: sql.replace('$TOPIC', `$${params.length + 1}`), params: [...params, topic] };
  };

  // Sualları rejimə görə seç
  let qrows;
  if (mode === 'range') {
    if (!from || !to || from > to)
      return res.status(400).json({ error: 'Düzgün interval daxil edin (başlanğıc ≤ son).' });
    if (from > totalAvailable)
      return res
        .status(400)
        .json({ error: `Başlanğıc sual ${from} mövcud deyil. Testdə ${totalAvailable} sual var.` });
    // Aralıq + (istəyə bağlı) say: count varsa həmin aralıqdan təsadüfi N sual
    const params: any[] = [testId, from, to];
    let sql = `SELECT id, position, text, options FROM questions
               WHERE test_id=$1 AND position BETWEEN $2 AND $3`;
    if (topic) {
      params.push(topic);
      sql += ` AND topic = $${params.length}`;
    }
    if (count) {
      params.push(count);
      sql += ` ORDER BY random() LIMIT $${params.length}`;
    } else {
      sql += ` ORDER BY position`;
    }
    qrows = (await query(sql, params)).rows;
  } else if (mode === 'random') {
    const q = withTopic(
      `SELECT id, position, text, options FROM questions WHERE test_id=$1${topicClause} ORDER BY random() LIMIT $2`,
      [testId, count || 20]
    );
    qrows = (await query(q.sql, q.params)).rows;
  } else {
    const q = withTopic(
      `SELECT id, position, text, options FROM questions WHERE test_id=$1${topicClause} ORDER BY position`,
      [testId]
    );
    qrows = (await query(q.sql, q.params)).rows;
  }
  if (!qrows.length) return res.status(400).json({ error: 'Seçilmiş diapazonda sual yoxdur.' });

  const shuffledQuestions = shuffle(qrows);
  const orderIds = shuffledQuestions.map((q) => q.id);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const s = await client.query(
      `INSERT INTO exam_sessions
        (user_id, test_id, mode, practice, config, question_order, duration_sec, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, started_at`,
      [
        req.user!.sub,
        testId,
        mode,
        !!practice,
        JSON.stringify({ from, to, count, topic }),
        JSON.stringify(orderIds),
        practice ? null : durationSec || null, // məşq rejimində taymer yoxdur
        shuffledQuestions.length,
      ]
    );
    const sessionId = s.rows[0].id;

    // Hər sual üçün variant qarışıqlığını (N variant) hesabla
    const publicQs: any[] = [];
    const answerRows: { questionId: string; shuffledOrder: number[] }[] = [];
    for (const q of shuffledQuestions) {
      const n = (q.options as string[]).length;
      // Variant sırası Excel-dəki kimi sabit qalır (qarışdırılmır)
      const shuffledOrder = Array.from({ length: n }, (_, i) => i);
      answerRows.push({ questionId: q.id, shuffledOrder });
      publicQs.push(publicQuestion(q, shuffledOrder));
    }
    await insertAnswers(client, sessionId, answerRows);

    await client.query('COMMIT');
    res.status(201).json({
      session: {
        id: sessionId,
        testTitle: test.rows[0].title,
        total: shuffledQuestions.length,
        durationSec: practice ? null : durationSec || null,
        practice: !!practice,
        startedAt: s.rows[0].started_at,
      },
      questions: publicQs,
    });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'İmtahan yaradıla bilmədi.' });
  } finally {
    client.release();
  }
});

// ---------- OFFLINE nəticəni serverə sinxronlaşdır ----------
const syncSchema = z.object({
  testId: z.string().uuid(),
  mode: z.enum(['range', 'random', 'full', 'mistakes', 'retry_wrong']).default('full'),
  practice: z.boolean().optional(),
  startedAt: z.string().optional(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      // istifadəçinin seçdiyi ORİJİNAL variant indeksi (offline-da variantlar qarışmır)
      originalIndex: z.number().int().min(0).nullable(),
    })
  ),
});

router.post('/sync', async (req: AuthedRequest, res) => {
  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { testId, mode, practice, startedAt, answers } = parsed.data;

  const test = await query('SELECT id FROM tests WHERE id=$1 AND owner_id=$2', [
    testId,
    req.user!.sub,
  ]);
  if (!test.rowCount) return res.status(404).json({ error: 'Test tapılmadı.' });
  if (!answers.length) return res.status(400).json({ error: 'Cavab yoxdur.' });

  // Bu sualların düzgün cavablarını və variant saylarını gətir
  const qids = answers.map((a) => a.questionId);
  const qrows = (
    await query(
      'SELECT id, correct_index, option_count FROM questions WHERE test_id=$1 AND id = ANY($2::uuid[])',
      [testId, qids]
    )
  ).rows;
  const qmap = new Map(qrows.map((q) => [q.id, q]));

  // Nəticəni hesabla
  let correct = 0;
  let unanswered = 0;
  const rows: { qid: string; sel: number | null; order: number[]; isCorrect: boolean | null }[] = [];
  for (const a of answers) {
    const q = qmap.get(a.questionId);
    if (!q) continue;
    const order = Array.from({ length: q.option_count }, (_, i) => i); // identik (qarışmır)
    if (a.originalIndex === null) {
      unanswered++;
      rows.push({ qid: a.questionId, sel: null, order, isCorrect: null });
    } else {
      const ok = a.originalIndex === q.correct_index;
      if (ok) correct++;
      rows.push({ qid: a.questionId, sel: a.originalIndex, order, isCorrect: ok });
    }
  }
  const total = rows.length;
  const wrong = total - correct - unanswered;
  const score = total ? Math.round((correct / total) * 10000) / 100 : 0;
  const grade = letterGrade(score);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const s = await client.query(
      `INSERT INTO exam_sessions
        (user_id, test_id, mode, practice, config, question_order, status,
         total, correct_count, wrong_count, unanswered_count, score, grade, started_at, submitted_at)
       VALUES ($1,$2,$3,$4,'{"offline":true}',$5,'submitted',$6,$7,$8,$9,$10,$11,$12, now())
       RETURNING id`,
      [
        req.user!.sub,
        testId,
        mode,
        !!practice,
        JSON.stringify(rows.map((r) => r.qid)),
        total,
        correct,
        wrong,
        unanswered,
        score,
        grade,
        startedAt ? new Date(startedAt) : new Date(),
      ]
    );
    const sessionId = s.rows[0].id;

    // exam_answers toplu insert (hissə-hissə)
    const CHUNK = 500;
    for (let start = 0; start < rows.length; start += CHUNK) {
      const slice = rows.slice(start, start + CHUNK);
      const vals: any[] = [];
      const ph: string[] = [];
      slice.forEach((r, i) => {
        const b = i * 5;
        ph.push(`($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5})`);
        vals.push(sessionId, r.qid, r.sel, JSON.stringify(r.order), r.isCorrect);
      });
      await client.query(
        `INSERT INTO exam_answers (session_id, question_id, selected_index, shuffled_order, is_correct)
         VALUES ${ph.join(',')}`,
        vals
      );
    }
    await client.query('COMMIT');
    res.status(201).json({
      result: { sessionId, total, correctCount: correct, wrong, unanswered, score, grade },
    });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Sinxronizasiya alınmadı.' });
  } finally {
    client.release();
  }
});

// ---------- Davam etmə (brauzer bağlandıqdan sonra) ----------
router.get('/:id/resume', async (req: AuthedRequest, res) => {
  const s = await query('SELECT * FROM exam_sessions WHERE id=$1 AND user_id=$2', [
    req.params.id,
    req.user!.sub,
  ]);
  if (!s.rowCount) return res.status(404).json({ error: 'Sessiya tapılmadı.' });
  if (s.rows[0].status !== 'in_progress')
    return res.status(409).json({ error: 'Bu imtahan artıq tamamlanıb.' });

  const answers = await query(
    `SELECT ea.question_id, ea.selected_index, ea.shuffled_order, ea.flagged,
            q.position, q.text, q.options
     FROM exam_answers ea JOIN questions q ON q.id = ea.question_id
     WHERE ea.session_id=$1`,
    [req.params.id]
  );
  const order: string[] = s.rows[0].question_order;
  const byId = new Map(answers.rows.map((r) => [r.question_id, r]));
  const questions = order.map((qid) => {
    const r: any = byId.get(qid);
    return publicQuestion(r, r.shuffled_order);
  });
  const saved = answers.rows
    .filter((r) => r.selected_index !== null)
    .map((r) => ({ questionId: r.question_id, selectedIndex: r.selected_index }));
  const flagged = answers.rows.filter((r) => r.flagged).map((r) => r.question_id);

  res.json({
    session: {
      id: s.rows[0].id,
      total: s.rows[0].total,
      durationSec: s.rows[0].duration_sec,
      practice: s.rows[0].practice,
      startedAt: s.rows[0].started_at,
    },
    questions,
    savedAnswers: saved,
    flagged,
  });
});

// ---------- Sualı nişanla / nişanı götür ----------
router.patch('/:id/flag', async (req: AuthedRequest, res) => {
  const schema = z.object({
    questionId: z.string().uuid(),
    flagged: z.boolean(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Yanlış məlumat.' });
  const s = await query(
    "SELECT id FROM exam_sessions WHERE id=$1 AND user_id=$2 AND status='in_progress'",
    [req.params.id, req.user!.sub]
  );
  if (!s.rowCount) return res.status(404).json({ error: 'Aktiv sessiya tapılmadı.' });
  await query('UPDATE exam_answers SET flagged=$1 WHERE session_id=$2 AND question_id=$3', [
    parsed.data.flagged,
    req.params.id,
    parsed.data.questionId,
  ]);
  res.json({ ok: true });
});

// ---------- Məşq rejimi: tək sualı dərhal yoxla (düzgün cavab + izah) ----------
router.post('/:id/check', async (req: AuthedRequest, res) => {
  const questionId = String(req.body.questionId || '');
  const s = await query(
    "SELECT id, practice FROM exam_sessions WHERE id=$1 AND user_id=$2 AND status='in_progress'",
    [req.params.id, req.user!.sub]
  );
  if (!s.rowCount) return res.status(404).json({ error: 'Aktiv sessiya tapılmadı.' });
  if (!s.rows[0].practice)
    return res.status(403).json({ error: 'Dərhal yoxlama yalnız məşq rejimində mümkündür.' });

  const r = (
    await query(
      `SELECT ea.selected_index, ea.shuffled_order, q.correct_index, q.options, q.explanation
       FROM exam_answers ea JOIN questions q ON q.id=ea.question_id
       WHERE ea.session_id=$1 AND ea.question_id=$2`,
      [req.params.id, questionId]
    )
  ).rows[0];
  if (!r) return res.status(404).json({ error: 'Sual tapılmadı.' });

  const order: number[] = r.shuffled_order;
  const correctDisplayIdx = order.indexOf(r.correct_index);
  const answered = r.selected_index !== null;
  const isCorrect = answered && order[r.selected_index] === r.correct_index;
  res.json({
    isCorrect,
    answered,
    correctIndex: correctDisplayIdx, // göstərilən sıradakı düzgün indeks
    correctText: r.options[r.correct_index],
    explanation: r.explanation,
  });
});

// ---------- Avtomatik yadda saxla (toplu) ----------
router.patch('/:id/answer', async (req: AuthedRequest, res) => {
  const schema = z.object({
    answers: z.array(
      z.object({
        questionId: z.string().uuid(),
        selectedIndex: z.number().int().min(0).nullable(),
      })
    ),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Yanlış cavab formatı.' });

  const s = await query(
    "SELECT id FROM exam_sessions WHERE id=$1 AND user_id=$2 AND status='in_progress'",
    [req.params.id, req.user!.sub]
  );
  if (!s.rowCount) return res.status(404).json({ error: 'Aktiv sessiya tapılmadı.' });

  for (const a of parsed.data.answers) {
    await query(
      `UPDATE exam_answers SET selected_index=$1, answered_at=now()
       WHERE session_id=$2 AND question_id=$3`,
      [a.selectedIndex, req.params.id, a.questionId]
    );
  }
  res.json({ saved: parsed.data.answers.length });
});

// ---------- İmtahanı təqdim et ----------
router.post('/:id/submit', async (req: AuthedRequest, res) => {
  const s = await query('SELECT * FROM exam_sessions WHERE id=$1 AND user_id=$2', [
    req.params.id,
    req.user!.sub,
  ]);
  if (!s.rowCount) return res.status(404).json({ error: 'Sessiya tapılmadı.' });
  if (s.rows[0].status !== 'in_progress')
    return res.status(409).json({ error: 'İmtahan artıq təqdim edilib.' });

  const ans = await query(
    `SELECT ea.id, ea.selected_index, ea.shuffled_order, q.correct_index
     FROM exam_answers ea JOIN questions q ON q.id=ea.question_id
     WHERE ea.session_id=$1`,
    [req.params.id]
  );

  let correctCount = 0;
  let unanswered = 0;
  const updates: { id: string; isCorrect: boolean | null }[] = [];

  for (const r of ans.rows) {
    if (r.selected_index === null) {
      unanswered++;
      updates.push({ id: r.id, isCorrect: null });
      continue;
    }
    const order: number[] = r.shuffled_order; // göstərilən sıradakı orijinal indekslər
    const originalIdx = order[r.selected_index]; // seçilən variantın orijinal indeksi
    const isCorrect = originalIdx === r.correct_index;
    if (isCorrect) correctCount++;
    updates.push({ id: r.id, isCorrect });
  }

  // is_correct sahəsini tək sorğuda toplu yenilə (performans)
  if (updates.length) {
    const ids = updates.map((u) => u.id);
    const flags = updates.map((u) => u.isCorrect);
    await query(
      `UPDATE exam_answers AS ea
         SET is_correct = u.flag
       FROM unnest($1::uuid[], $2::boolean[]) AS u(id, flag)
       WHERE ea.id = u.id`,
      [ids, flags]
    );
  }

  const total = ans.rows.length;
  const wrong = total - correctCount - unanswered; // cavablandırılıb, lakin səhv
  const score = total ? Math.round((correctCount / total) * 10000) / 100 : 0;
  const grade = letterGrade(score);

  await query(
    `UPDATE exam_sessions
       SET status='submitted', correct_count=$1, wrong_count=$2, unanswered_count=$3,
           score=$4, grade=$5, submitted_at=now()
     WHERE id=$6`,
    [correctCount, wrong, unanswered, score, grade, req.params.id]
  );

  res.json({
    result: { total, correctCount, wrong, unanswered, score, grade, sessionId: req.params.id },
  });
});

// ---------- Nəticə (xülasə) ----------
router.get('/:id/result', async (req: AuthedRequest, res) => {
  const s = await query(
    `SELECT s.*, t.title AS test_title
     FROM exam_sessions s JOIN tests t ON t.id=s.test_id
     WHERE s.id=$1 AND s.user_id=$2`,
    [req.params.id, req.user!.sub]
  );
  if (!s.rowCount) return res.status(404).json({ error: 'Nəticə tapılmadı.' });
  res.json({ result: s.rows[0] });
});

// ---------- Nəticəni (imtahan sessiyasını) sil ----------
router.delete('/:id', async (req: AuthedRequest, res) => {
  const r = await query('DELETE FROM exam_sessions WHERE id=$1 AND user_id=$2', [
    req.params.id,
    req.user!.sub,
  ]);
  if (!r.rowCount) return res.status(404).json({ error: 'Nəticə tapılmadı.' });
  res.json({ message: 'Nəticə silindi.' });
});

// ---------- Səhv sualların icmalı ----------
router.get('/:id/review', async (req: AuthedRequest, res) => {
  const s = await query('SELECT id FROM exam_sessions WHERE id=$1 AND user_id=$2', [
    req.params.id,
    req.user!.sub,
  ]);
  if (!s.rowCount) return res.status(404).json({ error: 'Sessiya tapılmadı.' });

  const rows = (
    await query(
      `SELECT ea.selected_index, ea.shuffled_order, ea.is_correct,
              q.id AS question_id, q.text, q.options, q.correct_index,
              q.explanation, q.difficulty, q.reference_note
       FROM exam_answers ea JOIN questions q ON q.id=ea.question_id
       WHERE ea.session_id=$1
       ORDER BY q.position`,
      [req.params.id]
    )
  ).rows;

  // Səhv = düzgün deyil (cavabsızlar da daxil)
  const review = rows
    .filter((r) => r.is_correct !== true)
    .map((r) => {
      const opts: string[] = r.options;
      const order: number[] = r.shuffled_order;
      const correctDisplayIdx = order.indexOf(r.correct_index);
      const answered = r.selected_index !== null;
      const yourOrigIdx = answered ? order[r.selected_index] : null;
      return {
        questionId: r.question_id,
        question: r.text,
        answered,
        yourAnswer: answered ? indexToLabel(r.selected_index) : null,
        yourAnswerText: answered ? opts[yourOrigIdx!] : null,
        correctAnswer: indexToLabel(correctDisplayIdx),
        correctAnswerText: opts[r.correct_index],
        explanation: r.explanation,
        difficulty: r.difficulty,
        reference: r.reference_note,
      };
    });

  res.json({ wrongCount: review.length, review });
});

// ---------- Səhv suallardan yeni mini-imtahan ----------
router.post('/:id/retry-wrong', async (req: AuthedRequest, res) => {
  const s = await query('SELECT * FROM exam_sessions WHERE id=$1 AND user_id=$2', [
    req.params.id,
    req.user!.sub,
  ]);
  if (!s.rowCount) return res.status(404).json({ error: 'Sessiya tapılmadı.' });

  // Düzgün cavablanmamış bütün suallar (səhv + cavabsız)
  const wrong = (
    await query(
      `SELECT q.id, q.position, q.text, q.options
       FROM exam_answers ea JOIN questions q ON q.id=ea.question_id
       WHERE ea.session_id=$1 AND (ea.is_correct = false OR ea.is_correct IS NULL)
       ORDER BY q.position`,
      [req.params.id]
    )
  ).rows;
  if (!wrong.length)
    return res.status(400).json({ error: 'Təkrarlanacaq səhv sual yoxdur. 🎉' });

  const shuffledQuestions = shuffle(wrong);
  const orderIds = shuffledQuestions.map((q) => q.id);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ns = await client.query(
      `INSERT INTO exam_sessions
        (user_id, test_id, parent_id, mode, config, question_order, total)
       VALUES ($1,$2,$3,'retry_wrong','{}',$4,$5) RETURNING id, started_at`,
      [
        req.user!.sub,
        s.rows[0].test_id,
        s.rows[0].id,
        JSON.stringify(orderIds),
        shuffledQuestions.length,
      ]
    );
    const sessionId = ns.rows[0].id;
    const publicQs: any[] = [];
    const answerRows: { questionId: string; shuffledOrder: number[] }[] = [];
    for (const q of shuffledQuestions) {
      const n = (q.options as string[]).length;
      const order = Array.from({ length: n }, (_, i) => i); // variant sırası sabit
      answerRows.push({ questionId: q.id, shuffledOrder: order });
      publicQs.push(publicQuestion(q, order));
    }
    await insertAnswers(client, sessionId, answerRows);
    await client.query('COMMIT');
    res.status(201).json({
      session: { id: sessionId, total: shuffledQuestions.length, durationSec: null },
      questions: publicQs,
    });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Təkrar imtahan yaradıla bilmədi.' });
  } finally {
    client.release();
  }
});

// ============================================================
//  SƏHVLƏR BANKI — bütün imtahanlarda səhv edilmiş və hələ
//  düzgün edilməmiş suallar (mənimsəyincə bankda qalır)
// ============================================================

// SQL: istifadəçinin səhv etdiyi (və heç düzgün etmədiyi) sualların seçimi
const MISTAKES_WHERE = `
  q.id IN (
    SELECT ea.question_id
    FROM exam_answers ea JOIN exam_sessions s ON s.id = ea.session_id
    WHERE s.user_id = $1 AND s.status = 'submitted' AND ea.is_correct = false
  )
  AND q.id NOT IN (
    SELECT ea.question_id
    FROM exam_answers ea JOIN exam_sessions s ON s.id = ea.session_id
    WHERE s.user_id = $1 AND s.status = 'submitted' AND ea.is_correct = true
  )
`;

// ---------- Səhvlər bankı xülasəsi ----------
router.get('/mistakes/summary', async (req: AuthedRequest, res) => {
  const total = await query(
    `SELECT COUNT(*)::int AS count FROM questions q WHERE ${MISTAKES_WHERE}`,
    [req.user!.sub]
  );
  const byTest = await query(
    `SELECT t.id AS test_id, t.title, COUNT(*)::int AS count
     FROM questions q JOIN tests t ON t.id = q.test_id
     WHERE ${MISTAKES_WHERE}
     GROUP BY t.id, t.title ORDER BY count DESC`,
    [req.user!.sub]
  );
  res.json({ total: total.rows[0].count, byTest: byTest.rows });
});

// ---------- Səhvlər bankından imtahan başlat ----------
router.post('/mistakes/start', async (req: AuthedRequest, res) => {
  const testId = req.body.testId as string | undefined;
  const count = Number(req.body.count) || null;
  const practice = !!req.body.practice;

  const params: any[] = [req.user!.sub];
  let sql = `SELECT q.id, q.position, q.text, q.options, q.test_id
             FROM questions q WHERE ${MISTAKES_WHERE}`;
  if (testId) {
    params.push(testId);
    sql += ` AND q.test_id = $${params.length}`;
  }
  sql += ' ORDER BY random()';
  if (count) {
    params.push(count);
    sql += ` LIMIT $${params.length}`;
  }
  const qrows = (await query(sql, params)).rows;
  if (!qrows.length)
    return res.status(400).json({ error: 'Səhvlər bankı boşdur. Əla! 🎉' });

  // Sessiya bir testə bağlanmalıdır (statistika üçün) — ilk sualın testini götür
  const sessionTestId = testId || qrows[0].test_id;
  const shuffledQuestions = shuffle(qrows);
  const orderIds = shuffledQuestions.map((q) => q.id);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ns = await client.query(
      `INSERT INTO exam_sessions
        (user_id, test_id, mode, practice, config, question_order, total)
       VALUES ($1,$2,'mistakes',$3,'{}',$4,$5) RETURNING id, started_at`,
      [req.user!.sub, sessionTestId, practice, JSON.stringify(orderIds), shuffledQuestions.length]
    );
    const sessionId = ns.rows[0].id;
    const publicQs: any[] = [];
    const answerRows: { questionId: string; shuffledOrder: number[] }[] = [];
    for (const q of shuffledQuestions) {
      const n = (q.options as string[]).length;
      const order = Array.from({ length: n }, (_, i) => i); // variant sırası sabit
      answerRows.push({ questionId: q.id, shuffledOrder: order });
      publicQs.push(publicQuestion(q, order));
    }
    await insertAnswers(client, sessionId, answerRows);
    await client.query('COMMIT');
    res.status(201).json({
      session: { id: sessionId, total: shuffledQuestions.length, durationSec: null, practice },
      questions: publicQs,
    });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Səhvlər imtahanı yaradıla bilmədi.' });
  } finally {
    client.release();
  }
});

export default router;

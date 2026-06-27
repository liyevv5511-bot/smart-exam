import { Router } from 'express';
import { query } from '../db/pool';
import { authRequired, adminOnly, AuthedRequest, invalidateUser } from '../middleware/auth';

const router = Router();
router.use(authRequired, adminOnly);

// ---------- CANLI fəaliyyət: kim hansı imtahanı yazır + irəliləyiş ----------
router.get('/activity', async (_req, res) => {
  const { rows } = await query(`
    SELECT s.id AS session_id, s.mode, s.total, s.practice, s.started_at,
           u.id AS user_id, u.full_name, u.email,
           t.title AS test_title,
           (SELECT COUNT(*) FROM exam_answers ea
              WHERE ea.session_id = s.id AND ea.selected_index IS NOT NULL) AS answered
    FROM exam_sessions s
    JOIN users u ON u.id = s.user_id
    JOIN tests t ON t.id = s.test_id
    WHERE s.status = 'in_progress'
    ORDER BY s.started_at DESC
  `);
  res.json({ active: rows, serverTime: new Date().toISOString() });
});

// ---------- Bütün tələbələr + statistika + CANLI status ----------
router.get('/users', async (_req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.full_name, u.email, u.role, u.is_active, u.created_at, u.last_seen, u.avatar_url,
            COALESCE(st.tests_uploaded,0) AS tests_uploaded,
            COALESCE(st.exams_taken,0)    AS exams_taken,
            COALESCE(st.avg_score,0)      AS avg_score,
            -- son 3 dəqiqədə aktiv olubsa → onlayn
            (u.last_seen IS NOT NULL AND u.last_seen > now() - interval '3 minutes') AS online,
            -- hazırda davam edən imtahanı varsa → imtahanda
            EXISTS (
              SELECT 1 FROM exam_sessions s
              WHERE s.user_id = u.id AND s.status = 'in_progress'
            ) AS in_exam
     FROM users u LEFT JOIN user_stats st ON st.user_id=u.id
     ORDER BY u.created_at DESC`
  );
  // Canlı xülasə
  const onlineCount = rows.filter((r) => r.online).length;
  const inExamCount = rows.filter((r) => r.in_exam).length;
  res.json({
    users: rows,
    live: { onlineCount, inExamCount, total: rows.filter((r) => r.role === 'student').length },
    serverTime: new Date().toISOString(),
  });
});

// ---------- Bir tələbənin TAM detalları (statistika + bütün imtahanlar + son nəticə) ----------
router.get('/users/:id/detail', async (req, res) => {
  const id = req.params.id;
  const u = await query(
    `SELECT id, full_name, email, role, is_active, created_at, last_seen, avatar_url FROM users WHERE id=$1`,
    [id]
  );
  if (!u.rowCount) return res.status(404).json({ error: 'İstifadəçi tapılmadı.' });
  const usr = u.rows[0];

  // Aqreqat statistika
  const stats = await query(
    `SELECT
        COUNT(*) FILTER (WHERE status='submitted')                          AS exams_taken,
        COALESCE(ROUND(AVG(score) FILTER (WHERE status='submitted'),2),0)   AS avg_score,
        COALESCE(MAX(score) FILTER (WHERE status='submitted'),0)            AS best_score,
        COALESCE(MIN(score) FILTER (WHERE status='submitted'),0)            AS worst_score,
        COALESCE(SUM(correct_count) FILTER (WHERE status='submitted'),0)    AS total_correct,
        COALESCE(SUM(total) FILTER (WHERE status='submitted'),0)            AS total_questions
     FROM exam_sessions WHERE user_id=$1`,
    [id]
  );
  const st = stats.rows[0];
  const successRate =
    Number(st.total_questions) > 0
      ? Math.round((Number(st.total_correct) / Number(st.total_questions)) * 10000) / 100
      : 0;

  // Yüklədiyi testlər
  const uploaded = await query(
    `SELECT id, title, source_file, question_count, created_at FROM tests WHERE owner_id=$1 ORDER BY created_at DESC`,
    [id]
  );

  // Bütün imtahanlar (ən sonu birinci)
  const exams = await query(
    `SELECT s.id, t.title AS test_title, s.mode, s.practice, s.total,
            s.correct_count, s.wrong_count, s.unanswered_count, s.score, s.grade, s.submitted_at
     FROM exam_sessions s JOIN tests t ON t.id=s.test_id
     WHERE s.user_id=$1 AND s.status='submitted'
     ORDER BY s.submitted_at DESC`,
    [id]
  );

  // İstifadəçinin rəyi
  const review = await query(
    'SELECT rating, comment, updated_at FROM reviews WHERE user_id=$1',
    [id]
  );

  // BÜTÜN HƏRƏKƏTLƏR — vahid fəaliyyət lenti (zaman üzrə)
  const activity: { type: string; text: string; when: string; meta?: any }[] = [];
  activity.push({ type: 'register', text: 'Qeydiyyatdan keçdi', when: usr.created_at });
  if (usr.avatar_url) activity.push({ type: 'avatar', text: 'Profil şəkli yüklədi', when: usr.created_at });
  uploaded.rows.forEach((t) =>
    activity.push({
      type: 'upload',
      text: `Test yüklədi: "${t.title}" (${t.question_count} sual)`,
      when: t.created_at,
    })
  );
  exams.rows.forEach((e) =>
    activity.push({
      type: 'exam',
      text: `${e.practice ? 'Məşq' : 'İmtahan'}: "${e.test_title}" — ${e.score}% (${e.grade})`,
      when: e.submitted_at,
      meta: { score: e.score, grade: e.grade },
    })
  );
  if (review.rows[0])
    activity.push({
      type: 'review',
      text: `Rəy yazdı: ${review.rows[0].rating}★ ${review.rows[0].comment ? '— "' + review.rows[0].comment + '"' : ''}`,
      when: review.rows[0].updated_at,
    });
  activity.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

  res.json({
    user: usr,
    stats: {
      exams_taken: Number(st.exams_taken),
      avg_score: Number(st.avg_score),
      best_score: Number(st.best_score),
      worst_score: Number(st.worst_score),
      success_rate: successRate,
      tests_uploaded: uploaded.rowCount,
    },
    latest: exams.rows[0] || null,
    exams: exams.rows,
    uploadedTests: uploaded.rows,
    review: review.rows[0] || null,
    activity,
  });
});

// ---------- Bir istifadəçinin yüklədiyi testlər ----------
router.get('/users/:id/tests', async (req, res) => {
  const u = await query('SELECT id, full_name, email, created_at FROM users WHERE id=$1', [
    req.params.id,
  ]);
  if (!u.rowCount) return res.status(404).json({ error: 'İstifadəçi tapılmadı.' });
  const tests = await query(
    `SELECT id, title, source_file, question_count, created_at
     FROM tests WHERE owner_id=$1 ORDER BY created_at DESC`,
    [req.params.id]
  );
  res.json({ user: u.rows[0], tests: tests.rows });
});

// ---------- İstifadəçini aktiv/deaktiv et (DƏRHAL təsir edir) ----------
router.patch('/users/:id/active', async (req: AuthedRequest, res) => {
  if (req.params.id === req.user!.sub)
    return res.status(400).json({ error: 'Öz hesabınızı deaktiv edə bilməzsiniz.' });
  const { rows } = await query(
    'UPDATE users SET is_active=$1 WHERE id=$2 RETURNING id, is_active',
    [!!req.body.isActive, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'İstifadəçi tapılmadı.' });
  invalidateUser(req.params.id); // keşi təmizlə → blok dərhal qüvvəyə minir
  res.json({ user: rows[0] });
});

// ---------- İstifadəçinin rolunu dəyiş (admin et / tələbə et) ----------
router.patch('/users/:id/role', async (req: AuthedRequest, res) => {
  const role = req.body.role === 'admin' ? 'admin' : 'student';
  if (req.params.id === req.user!.sub)
    return res.status(400).json({ error: 'Öz rolunuzu dəyişə bilməzsiniz.' });
  const { rows } = await query(
    'UPDATE users SET role=$1 WHERE id=$2 RETURNING id, role',
    [role, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'İstifadəçi tapılmadı.' });
  res.json({ user: rows[0] });
});

// ---------- İstifadəçini sil ----------
router.delete('/users/:id', async (req: AuthedRequest, res) => {
  if (req.params.id === req.user!.sub)
    return res.status(400).json({ error: 'Öz hesabınızı silə bilməzsiniz.' });
  const r = await query('DELETE FROM users WHERE id=$1', [req.params.id]);
  if (!r.rowCount) return res.status(404).json({ error: 'İstifadəçi tapılmadı.' });
  invalidateUser(req.params.id);
  res.json({ message: 'İstifadəçi silindi.' });
});

// ---------- Bütün testlər (yükləmələr) ----------
router.get('/tests', async (_req, res) => {
  const { rows } = await query(
    `SELECT t.id, t.title, t.source_file, t.question_count, t.created_at,
            u.full_name AS owner_name, u.email AS owner_email
     FROM tests t JOIN users u ON u.id=t.owner_id
     ORDER BY t.created_at DESC`
  );
  res.json({ tests: rows });
});

// ---------- İstənilən testin MƏZMUNUNU gör (admin) ----------
router.get('/tests/:id', async (req, res) => {
  const t = await query(
    `SELECT t.id, t.title, t.source_file, t.question_count, t.created_at,
            u.full_name AS owner_name, u.email AS owner_email
     FROM tests t JOIN users u ON u.id = t.owner_id
     WHERE t.id = $1`,
    [req.params.id]
  );
  if (!t.rowCount) return res.status(404).json({ error: 'Test tapılmadı.' });
  const q = await query(
    `SELECT position, text, options, option_count, correct_index, explanation, topic, difficulty
     FROM questions WHERE test_id = $1 ORDER BY position`,
    [req.params.id]
  );
  res.json({ test: t.rows[0], questions: q.rows });
});

// ---------- Testi sil ----------
router.delete('/tests/:id', async (req, res) => {
  const r = await query('DELETE FROM tests WHERE id=$1', [req.params.id]);
  if (!r.rowCount) return res.status(404).json({ error: 'Test tapılmadı.' });
  res.json({ message: 'Test silindi.' });
});

// ---------- Bütün rəylər (admin moderasiyası) ----------
router.get('/reviews', async (_req, res) => {
  const { rows } = await query(
    `SELECT r.id, r.rating, r.comment, r.is_visible, r.created_at,
            u.full_name, u.email
     FROM reviews r JOIN users u ON u.id = r.user_id
     ORDER BY r.created_at DESC`
  );
  res.json({ reviews: rows });
});

router.patch('/reviews/:id/visible', async (req, res) => {
  await query('UPDATE reviews SET is_visible=$1 WHERE id=$2', [
    !!req.body.isVisible,
    req.params.id,
  ]);
  res.json({ ok: true });
});

router.delete('/reviews/:id', async (req, res) => {
  const r = await query('DELETE FROM reviews WHERE id=$1', [req.params.id]);
  if (!r.rowCount) return res.status(404).json({ error: 'Rəy tapılmadı.' });
  res.json({ message: 'Rəy silindi.' });
});

// ---------- Bütün istifadəçilərə bildiriş göndər ----------
router.post('/broadcast', async (req, res) => {
  const title = String(req.body.title || '').trim();
  const body = String(req.body.body || '').trim();
  if (!title) return res.status(400).json({ error: 'Başlıq tələb olunur.' });
  const r = await query(
    `INSERT INTO notifications (user_id, title, body)
     SELECT id, $1, $2 FROM users`,
    [title, body || null]
  );
  res.json({ sent: r.rowCount });
});

// ---------- Qlobal statistika ----------
router.get('/stats', async (_req, res) => {
  const totals = await query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role='student')        AS students,
      (SELECT COUNT(*) FROM tests)                             AS tests,
      (SELECT COUNT(*) FROM questions)                         AS questions,
      (SELECT COUNT(*) FROM exam_sessions WHERE status='submitted') AS exams_taken,
      (SELECT COALESCE(ROUND(AVG(score),2),0) FROM exam_sessions WHERE status='submitted') AS avg_score
  `);
  const topStudents = await query(`
    SELECT u.full_name, u.email, COALESCE(ROUND(AVG(s.score),1),0) AS avg_score,
           COUNT(s.id)::int AS attempts
    FROM users u JOIN exam_sessions s ON s.user_id=u.id AND s.status='submitted'
    WHERE u.role='student'
    GROUP BY u.id ORDER BY avg_score DESC LIMIT 10
  `);
  res.json({ totals: totals.rows[0], topStudents: topStudents.rows });
});

export default router;

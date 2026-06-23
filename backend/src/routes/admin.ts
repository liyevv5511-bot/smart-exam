import { Router } from 'express';
import { query } from '../db/pool';
import { authRequired, adminOnly, AuthedRequest } from '../middleware/auth';

const router = Router();
router.use(authRequired, adminOnly);

// ---------- Bütün tələbələr + statistika + CANLI status ----------
router.get('/users', async (_req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.full_name, u.email, u.role, u.is_active, u.created_at, u.last_seen,
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

// ---------- İstifadəçini aktiv/deaktiv et ----------
router.patch('/users/:id/active', async (req, res) => {
  const { rows } = await query(
    'UPDATE users SET is_active=$1 WHERE id=$2 RETURNING id, is_active',
    [!!req.body.isActive, req.params.id]
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

// ---------- Testi sil ----------
router.delete('/tests/:id', async (req, res) => {
  const r = await query('DELETE FROM tests WHERE id=$1', [req.params.id]);
  if (!r.rowCount) return res.status(404).json({ error: 'Test tapılmadı.' });
  res.json({ message: 'Test silindi.' });
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

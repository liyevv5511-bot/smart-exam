import { Router } from 'express';
import { query } from '../db/pool';
import { authRequired, AuthedRequest } from '../middleware/auth';

const router = Router();
router.use(authRequired);

// ---------- İdarəetmə paneli xülasəsi ----------
router.get('/dashboard', async (req: AuthedRequest, res) => {
  const uid = req.user!.sub;
  const stats = await query('SELECT * FROM user_stats WHERE user_id=$1', [uid]);
  const recent = await query(
    `SELECT s.id, t.title AS test_title, s.mode, s.score, s.grade,
            s.correct_count, s.wrong_count, s.total, s.submitted_at
     FROM exam_sessions s JOIN tests t ON t.id=s.test_id
     WHERE s.user_id=$1 AND s.status='submitted'
     ORDER BY s.submitted_at DESC LIMIT 8`,
    [uid]
  );
  res.json({
    summary: stats.rows[0] || {
      tests_uploaded: 0,
      exams_taken: 0,
      avg_score: 0,
      success_rate: 0,
    },
    recentActivity: recent.rows,
  });
});

// ---------- Analitika (qrafiklər üçün) ----------
router.get('/analytics', async (req: AuthedRequest, res) => {
  const uid = req.user!.sub;

  // Bal trendi (zaman üzrə)
  const trend = await query(
    `SELECT to_char(submitted_at,'YYYY-MM-DD') AS date, ROUND(AVG(score),1) AS score
     FROM exam_sessions
     WHERE user_id=$1 AND status='submitted'
     GROUP BY 1 ORDER BY 1`,
    [uid]
  );

  // Bal paylanması (qiymət üzrə)
  const grades = await query(
    `SELECT grade, COUNT(*)::int AS count
     FROM exam_sessions WHERE user_id=$1 AND status='submitted'
     GROUP BY grade`,
    [uid]
  );

  // İmtahan tarixçəsi
  const history = await query(
    `SELECT s.id, t.title AS test_title, s.mode, s.score, s.grade,
            s.correct_count, s.wrong_count, s.total, s.submitted_at
     FROM exam_sessions s JOIN tests t ON t.id=s.test_id
     WHERE s.user_id=$1 AND s.status='submitted'
     ORDER BY s.submitted_at DESC LIMIT 50`,
    [uid]
  );

  res.json({
    trend: trend.rows,
    grades: grades.rows,
    history: history.rows,
  });
});

export default router;

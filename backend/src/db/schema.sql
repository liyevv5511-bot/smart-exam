-- ============================================================
--  AĞILLI İMTAHAN SİSTEMİ — PostgreSQL Sxeması
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- İstifadəçilər ----------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin')),
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ---------- Şifrə bərpa tokenləri ----------
CREATE TABLE IF NOT EXISTS password_resets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Testlər (yüklənmiş Excel = sual bankı) ----------
CREATE TABLE IF NOT EXISTS tests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  source_file    TEXT,                       -- orijinal fayl adı
  question_count INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tests_owner ON tests(owner_id);

-- ---------- Suallar (DİNAMİK variant sayı: 2, 3, 4, 5, 6+ ) ----------
CREATE TABLE IF NOT EXISTS questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id       UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,            -- fayldakı sıra (1-dən başlayır)
  text          TEXT NOT NULL,
  options       JSONB NOT NULL,              -- variant mətnləri massivi: ["React","HTML",...]
  option_count  INTEGER NOT NULL,            -- variant sayı (cache)
  correct_index INTEGER NOT NULL,            -- düzgün variantın indeksi (0-dan)
  explanation   TEXT,
  difficulty    TEXT,                        -- çətinlik səviyyəsi (varsa)
  reference_note TEXT,                       -- ədəbiyyat/istinad (varsa)
  topic         TEXT,                        -- mövzu/fəsil teqi (varsa)
  UNIQUE (test_id, position),
  CHECK (correct_index >= 0 AND correct_index < option_count)
);
CREATE INDEX IF NOT EXISTS idx_questions_test ON questions(test_id);

-- ---------- İmtahan sessiyaları (cəhdlər) ----------
CREATE TABLE IF NOT EXISTS exam_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_id        UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  parent_id      UUID REFERENCES exam_sessions(id) ON DELETE SET NULL, -- "səhvləri təkrarla" zənciri
  mode           TEXT NOT NULL DEFAULT 'full'
                   CHECK (mode IN ('range','random','full','retry_wrong','mistakes')),
  practice       BOOLEAN NOT NULL DEFAULT FALSE, -- məşq rejimi (dərhal cavab göstərilir)
  config         JSONB NOT NULL DEFAULT '{}',     -- {from,to} və ya {count}
  question_order JSONB NOT NULL,                  -- təsadüfiləşdirilmiş sual id-ləri massivi
  duration_sec   INTEGER,                         -- taymer üçün (saniyə)
  status         TEXT NOT NULL DEFAULT 'in_progress'
                   CHECK (status IN ('in_progress','submitted','expired')),
  total            INTEGER NOT NULL DEFAULT 0,
  correct_count    INTEGER NOT NULL DEFAULT 0,
  wrong_count      INTEGER NOT NULL DEFAULT 0,  -- cavablandırılıb, lakin səhv
  unanswered_count INTEGER NOT NULL DEFAULT 0,  -- cavabsız qalan suallar
  score          NUMERIC(5,2) NOT NULL DEFAULT 0, -- faiz
  grade          TEXT,                            -- A/B/C/D/F
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON exam_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_test ON exam_sessions(test_id);

-- ---------- Cavablar (tələbənin hər sual üçün cavabı) ----------
CREATE TABLE IF NOT EXISTS exam_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_index  INTEGER,        -- göstərilən (qarışdırılmış) sıradakı indeks; NULL = cavabsız
  -- imtahan zamanı variantların qarışdırılmış sırası (orijinal indekslərin permutasiyası, məs: [2,0,4,1,3])
  shuffled_order  JSONB NOT NULL,
  is_correct      BOOLEAN,
  flagged         BOOLEAN NOT NULL DEFAULT FALSE, -- tələbə tərəfindən nişanlanıb (sonra qayıtmaq üçün)
  answered_at     TIMESTAMPTZ,
  UNIQUE (session_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_answers_session ON exam_answers(session_id);

-- ---------- Bildirişlər ----------
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);

-- ---------- Statistika görünüşü (aqreqasiya) ----------
CREATE OR REPLACE VIEW user_stats AS
SELECT
  u.id                                            AS user_id,
  COUNT(DISTINCT t.id)                            AS tests_uploaded,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status='submitted') AS exams_taken,
  COALESCE(ROUND(AVG(s.score) FILTER (WHERE s.status='submitted'), 2), 0) AS avg_score,
  COALESCE(ROUND(
    100.0 * SUM(s.correct_count) FILTER (WHERE s.status='submitted')
    / NULLIF(SUM(s.total) FILTER (WHERE s.status='submitted'), 0), 2), 0) AS success_rate
FROM users u
LEFT JOIN tests t          ON t.owner_id = u.id
LEFT JOIN exam_sessions s  ON s.user_id  = u.id
GROUP BY u.id;

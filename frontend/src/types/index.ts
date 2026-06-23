export interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'student' | 'admin';
  avatar_url?: string | null;
  created_at?: string;
}

export interface Test {
  id: string;
  title: string;
  description?: string;
  source_file?: string;
  question_count: number;
  created_at: string;
}

export interface ExamOption {
  index: number; // göstərilən mövqe (cavab kimi göndərilir)
  label: string; // A, B, C, D, E, ...
  text: string;
}

export interface ExamQuestion {
  id: string;
  position: number;
  text: string;
  optionCount: number; // dinamik variant sayı
  options: ExamOption[];
}

export interface ExamSession {
  id: string;
  testTitle?: string;
  total: number;
  durationSec: number | null;
  practice?: boolean;
  startedAt?: string;
}

export interface TopicCount {
  topic: string;
  count: number;
}

export interface PreviewResult {
  strategy: string;
  count: number;
  warnings: string[];
  topics: string[];
  optionDistribution: Record<number, number>;
  sample: {
    position: number;
    text: string;
    options: string[];
    correct: string;
    topic?: string;
  }[];
}

export interface ExamResult {
  total: number;
  correctCount: number;
  wrong: number;
  unanswered: number;
  score: number;
  grade: string;
  sessionId: string;
}

export interface ReviewItem {
  questionId: string;
  question: string;
  answered: boolean;
  yourAnswer: string | null;
  yourAnswerText: string | null;
  correctAnswer: string;
  correctAnswerText: string;
  explanation?: string;
  difficulty?: string;
  reference?: string;
}

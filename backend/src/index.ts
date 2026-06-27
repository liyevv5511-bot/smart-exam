import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth';
import testRoutes from './routes/tests';
import examRoutes from './routes/exams';
import statsRoutes from './routes/stats';
import profileRoutes from './routes/profile';
import adminRoutes from './routes/admin';
import notifRoutes from './routes/notifications';
import reviewRoutes from './routes/reviews';

dotenv.config();

const app = express();

// İcazə verilən frontend ünvanları (vergüllə ayrılmış). Təyin olunmasa hamısına icazə.
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim())
  : null;
app.use(
  cors({
    origin: (origin, cb) => {
      if (!allowedOrigins || !origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('CORS: bu ünvana icazə yoxdur.'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

// Doğrulama uç nöqtələri üçün sürət limiti
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  message: { error: 'Çox sayda cəhd. Bir az sonra yenidən yoxlayın.' },
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/reviews', reviewRoutes);

// Qlobal xəta tutucusu
app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Server xətası.' });
  }
);

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`🚀 API http://localhost:${PORT} ünvanında işləyir`);
});

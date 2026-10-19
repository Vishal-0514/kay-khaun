import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { languageMiddleware } from './i18n.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import chatRoutes from './routes/chat.js';
import cookRoutes from './routes/cook.js';
import planRoutes from './routes/plan.js';
import meRoutes from './routes/me.js';
import reportRoutes from './routes/reports.js';
import contactRoutes from './routes/contact.js';
import voiceRoutes from './routes/voice.js';
import moodRoutes from './routes/mood.js';
import songRoutes from './routes/songs.js';

const app = express();
// Render sits in front of the server: trust its one proxy hop so req.ip is the visitor's address.
app.set('trust proxy', 1);

app.use(cors());
// Interface language (Accept-Language: hi) for text the server writes.
app.use(languageMiddleware);
// Fridge photos are bigger than everything else, so only that route gets a bigger limit.
app.use('/api/cook/scan', express.json({ limit: '6mb' }));
app.use('/api/mood/snap', express.json({ limit: '6mb' }));
app.use('/api/songs', express.json({ limit: '6mb' }));
app.use(express.json({ limit: '100kb' }));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/cook', cookRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/me', meRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/songs', songRoutes);

// The policy pages live on the company website now; old links (store listings,
// earlier app builds) are sent there permanently.
const SITE = 'https://www.karisglobalretail.com/apps/kya-khaun';
const moved = (to) => (req, res) => res.redirect(301, SITE + to);
app.get('/privacy', moved('/privacy'));
app.get('/terms', moved('/terms'));
app.get('/delete-account', moved('/delete-account'));
app.get('/', moved(''));

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 4100;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Kya Khaun server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});

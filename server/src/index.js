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
import { privacyPage, termsPage, deleteAccountPage } from './legal/pages.js';

const app = express();

app.use(cors());
// Interface language (Accept-Language: hi) for text the server writes.
app.use(languageMiddleware);
// Fridge photos are bigger than everything else, so only that route gets a bigger limit.
app.use('/api/cook/scan', express.json({ limit: '6mb' }));
app.use(express.json({ limit: '100kb' }));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/cook', cookRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/me', meRoutes);
app.use('/api/reports', reportRoutes);

// Public pages for the app stores (and linked from the app).
const html = (render) => (req, res) => res.type('html').set('Cache-Control', 'public, max-age=3600').send(render());
app.get('/privacy', html(privacyPage));
app.get('/terms', html(termsPage));
app.get('/delete-account', html(deleteAccountPage));
app.get('/', (req, res) => res.redirect('/privacy'));

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

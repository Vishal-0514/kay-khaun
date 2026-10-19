// Sentry first, so it can watch everything that loads after it.
import './instrument.js';
import app from './app.js';
import { connectDB } from './config/db.js';

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

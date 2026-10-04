import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/', (req, res) => {
  res.json({ success: true, db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

export default router;

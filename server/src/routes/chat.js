import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../utils/validate.js';
import { sendMessageSchema, quickPicksSchema } from '../validators/chatValidators.js';
import { sendMessage, listConversations, getConversation, quickPicks, status } from '../controllers/chatController.js';

const router = Router();

router.get('/status', status);
router.post('/messages', requireAuth, validateBody(sendMessageSchema), sendMessage);
router.get('/', requireAuth, listConversations);
router.get('/:id', requireAuth, getConversation);
router.post('/quick-picks', requireAuth, validateBody(quickPicksSchema), quickPicks);

export default router;

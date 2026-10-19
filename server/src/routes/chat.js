import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { aiQuota, perUser } from '../middleware/security.js';
import { validateBody } from '../utils/validate.js';
import { sendMessageSchema, quickPicksSchema } from '../validators/chatValidators.js';
import { sendMessage, listConversations, deleteConversation, clearConversations, getConversation, quickPicks, status, occasionNow } from '../controllers/chatController.js';

const router = Router();

router.get('/status', status);
router.get('/occasion', requireAuth, occasionNow);
router.post('/messages', requireAuth, perUser(80), aiQuota, validateBody(sendMessageSchema), sendMessage);
router.get('/', requireAuth, listConversations);
router.delete('/', requireAuth, clearConversations);
router.get('/:id', requireAuth, getConversation);
router.delete('/:id', requireAuth, deleteConversation);
router.post('/quick-picks', requireAuth, perUser(150), validateBody(quickPicksSchema), quickPicks);

export default router;

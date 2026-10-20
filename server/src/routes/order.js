import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { perUser } from '../middleware/security.js';
import { validateBody } from '../utils/validate.js';
import { orderPageSchema } from '../validators/orderValidators.js';
import { orderPage, searchLink } from '../services/orderPages.js';
import { aiEnabled } from '../services/ai.js';

// POST /api/order/page → the restaurant's own page on Zomato or Swiggy
// ({ url, found }). Only the restaurant's public name and area are searched for;
// nothing about the person is sent. Remembered per restaurant (services/orderPages.js).
const router = Router();
router.post('/page', requireAuth, perUser(60), validateBody(orderPageSchema), async (req, res) => {
  const { app, ...place } = req.body;
  if (!aiEnabled || !place.id) {
    return res.json({ success: true, url: searchLink(app, place), found: false });
  }
  res.json({ success: true, ...(await orderPage(app, place)) });
});

export default router;

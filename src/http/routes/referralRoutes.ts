import { Router } from 'express';

import { referralService } from '../../services/index.js';
import { requireAuth } from '../authMiddleware.js';

export const referralRouter = Router();

referralRouter.use(requireAuth);
referralRouter.get('/', async (request, response) =>
  response.json(await referralService.getSummary(request.userId ?? ''))
);

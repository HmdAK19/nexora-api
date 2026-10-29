import { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

import { OrderError, orderService } from '../../services/index.js';
import { requireAuth } from '../authMiddleware.js';

const orderSchema = z.object({
  symbol: z.string().regex(/^[A-Z0-9]{2,12}-[A-Z0-9]{2,12}$/),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['limit', 'market']),
  price: z.number().positive(),
  amount: z.number().positive().max(1000000),
});
const keySchema = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/);
const writeLimit = rateLimit({
  legacyHeaders: false,
  limit: 30,
  message: { code: 'RATE_LIMITED', message: 'Too many order requests' },
  standardHeaders: 'draft-8',
  windowMs: 60_000,
});

function handleOrderError(error: unknown, response: Response) {
  if (!(error instanceof OrderError)) return false;
  response.status(error.status).json({ code: error.code, message: error.code });
  return true;
}
export const orderRouter = Router();
orderRouter.use(requireAuth);
orderRouter.get('/', (request, response) => response.json(orderService.list(request.userId ?? '')));
orderRouter.post('/', writeLimit, (request, response, next) => {
  try {
    const input = orderSchema.parse(request.body);
    const key = keySchema.parse(request.header('Idempotency-Key'));
    return response.status(201).json(orderService.create(request.userId ?? '', input, key));
  } catch (error) {
    if (handleOrderError(error, response)) return;
    return next(error);
  }
});
orderRouter.patch('/:id/cancel', writeLimit, (request, response, next) => {
  try {
    return response.json(
      orderService.cancel(request.userId ?? '', z.string().uuid().parse(request.params.id))
    );
  } catch (error) {
    if (handleOrderError(error, response)) return;
    return next(error);
  }
});

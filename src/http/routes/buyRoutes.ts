import { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

import { PurchaseError, purchaseService } from '../../services/purchaseService.js';
import { requireAuth } from '../authMiddleware.js';

const quoteSchema = z.object({
  asset: z.enum(['BTC', 'ETH', 'USDT']),
  fiatAmount: z.number().min(10).max(50_000).multipleOf(0.01),
  fiatCurrency: z.literal('USD'),
});
const orderSchema = z.object({
  quoteId: z.string().uuid(),
});
const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/);
const quoteRateLimit = rateLimit({
  legacyHeaders: false,
  limit: 30,
  message: { code: 'RATE_LIMITED', message: 'Too many quote requests' },
  standardHeaders: 'draft-8',
  windowMs: 60_000,
});
const orderRateLimit = rateLimit({
  legacyHeaders: false,
  limit: 10,
  message: { code: 'RATE_LIMITED', message: 'Too many purchase requests' },
  standardHeaders: 'draft-8',
  windowMs: 60_000,
});

function handlePurchaseError(error: unknown, response: Response) {
  if (!(error instanceof PurchaseError)) return false;

  response.status(error.status).json({ code: error.code, message: error.code });
  return true;
}

export const buyRouter = Router();
buyRouter.use(requireAuth);

buyRouter.post('/quotes', quoteRateLimit, (request, response, next) => {
  try {
    const input = quoteSchema.parse(request.body);
    return response
      .status(201)
      .json(purchaseService.createQuote(request.userId ?? '', input.asset, input.fiatAmount));
  } catch (error) {
    if (handlePurchaseError(error, response)) return;
    return next(error);
  }
});

buyRouter.post('/orders', orderRateLimit, (request, response, next) => {
  try {
    const input = orderSchema.parse(request.body);
    const idempotencyKey = idempotencyKeySchema.parse(request.header('Idempotency-Key'));
    return response
      .status(201)
      .json(purchaseService.executeQuote(request.userId ?? '', input.quoteId, idempotencyKey));
  } catch (error) {
    if (handlePurchaseError(error, response)) return;
    return next(error);
  }
});

buyRouter.get('/orders/:id', (request, response, next) => {
  try {
    const orderId = z.string().uuid().parse(request.params.id);
    return response.json(purchaseService.getOrder(request.userId ?? '', orderId));
  } catch (error) {
    if (handlePurchaseError(error, response)) return;
    return next(error);
  }
});

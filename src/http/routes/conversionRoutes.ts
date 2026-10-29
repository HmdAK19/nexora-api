import { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

import { ConversionError, conversionService } from '../../services/conversionService.js';
import { requireAuth } from '../authMiddleware.js';

const quoteSchema = z
  .object({
    fromAsset: z.enum(['BTC', 'ETH', 'USDT', 'SOL']),
    sourceAmount: z.number().positive().max(1_000_000),
    toAsset: z.enum(['BTC', 'ETH', 'USDT', 'SOL']),
  })
  .refine((input) => input.fromAsset !== input.toAsset, { message: 'Assets must differ' });
const orderSchema = z.object({ quoteId: z.string().uuid() });
const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/);
const quoteRateLimit = rateLimit({
  legacyHeaders: false,
  limit: 30,
  message: { code: 'RATE_LIMITED', message: 'Too many conversion quote requests' },
  standardHeaders: 'draft-8',
  windowMs: 60_000,
});
const orderRateLimit = rateLimit({
  legacyHeaders: false,
  limit: 10,
  message: { code: 'RATE_LIMITED', message: 'Too many conversion requests' },
  standardHeaders: 'draft-8',
  windowMs: 60_000,
});

function handleConversionError(error: unknown, response: Response) {
  if (!(error instanceof ConversionError)) return false;

  response.status(error.status).json({ code: error.code, message: error.code });
  return true;
}

export const conversionRouter = Router();
conversionRouter.use(requireAuth);

conversionRouter.post('/quotes', quoteRateLimit, (request, response, next) => {
  try {
    const input = quoteSchema.parse(request.body);
    return response
      .status(201)
      .json(
        conversionService.createQuote(
          request.userId ?? '',
          input.fromAsset,
          input.toAsset,
          input.sourceAmount
        )
      );
  } catch (error) {
    if (handleConversionError(error, response)) return;
    return next(error);
  }
});

conversionRouter.post('/orders', orderRateLimit, (request, response, next) => {
  try {
    const input = orderSchema.parse(request.body);
    const idempotencyKey = idempotencyKeySchema.parse(request.header('Idempotency-Key'));
    return response
      .status(201)
      .json(conversionService.executeQuote(request.userId ?? '', input.quoteId, idempotencyKey));
  } catch (error) {
    if (handleConversionError(error, response)) return;
    return next(error);
  }
});

conversionRouter.get('/orders/:id', (request, response, next) => {
  try {
    const orderId = z.string().uuid().parse(request.params.id);
    return response.json(conversionService.getOrder(request.userId ?? '', orderId));
  } catch (error) {
    if (handleConversionError(error, response)) return;
    return next(error);
  }
});

import { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

import { SupportError, supportService } from '../../services/index.js';
import { requireAuth } from '../authMiddleware.js';

const ticketIdSchema = z.string().uuid();
const messageSchema = z.string().trim().min(10).max(4_000);
const createSchema = z.object({
  category: z.enum(['account', 'wallet', 'trading', 'verification', 'security']),
  message: messageSchema,
  subject: z.string().trim().min(4).max(120),
});
const replySchema = z.object({ message: messageSchema });
const writeRateLimit = rateLimit({
  legacyHeaders: false,
  limit: 20,
  message: { code: 'RATE_LIMITED', message: 'Too many support requests' },
  standardHeaders: 'draft-8',
  windowMs: 60 * 60 * 1_000,
});

function handleSupportError(error: unknown, response: Response) {
  if (!(error instanceof SupportError)) return false;

  response.status(error.status).json({ code: error.code, message: error.code });
  return true;
}

export const supportRouter = Router();
supportRouter.use(requireAuth);

supportRouter.get('/tickets', async (request, response) =>
  response.json(await supportService.listTickets(request.userId ?? ''))
);

supportRouter.post('/tickets', writeRateLimit, async (request, response, next) => {
  try {
    const input = createSchema.parse(request.body);
    return response
      .status(201)
      .json(await supportService.createTicket(request.userId ?? '', input.subject, input.category, input.message));
  } catch (error) {
    if (handleSupportError(error, response)) return;
    return next(error);
  }
});

supportRouter.get('/tickets/:id', async (request, response, next) => {
  try {
    return response.json(
      await supportService.getTicket(request.userId ?? '', ticketIdSchema.parse(request.params.id))
    );
  } catch (error) {
    if (handleSupportError(error, response)) return;
    return next(error);
  }
});

supportRouter.post('/tickets/:id/messages', writeRateLimit, async (request, response, next) => {
  try {
    const input = replySchema.parse(request.body);
    return response
      .status(201)
      .json(
        await supportService.reply(request.userId ?? '', ticketIdSchema.parse(request.params.id), input.message)
      );
  } catch (error) {
    if (handleSupportError(error, response)) return;
    return next(error);
  }
});

supportRouter.patch('/tickets/:id/close', writeRateLimit, async (request, response, next) => {
  try {
    return response.json(
      await supportService.closeTicket(request.userId ?? '', ticketIdSchema.parse(request.params.id))
    );
  } catch (error) {
    if (handleSupportError(error, response)) return;
    return next(error);
  }
});

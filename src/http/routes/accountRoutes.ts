import { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

import {
  AccountSecurityError,
  MfaError,
  NotificationError,
  accountService,
  notificationService,
} from '../../services/index.js';
import { requireAuth } from '../authMiddleware.js';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(8).max(128),
    newPassword: z.string().min(8).max(128),
  })
  .refine((input) => input.currentPassword !== input.newPassword, { path: ['newPassword'] });
const sessionIdSchema = z.string().uuid();
const notificationIdSchema = z.string().min(1).max(100);
const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^\+?[\d\s-]{8,16}$/),
});
const preferencesSchema = z.object({
  colorMode: z.enum(['dark', 'light']),
  language: z.enum(['en', 'fa']),
  priceAlerts: z.boolean(),
  tradingNotifications: z.boolean(),
});
const mfaSetupSchema = z.object({ currentPassword: z.string().min(8).max(128) });
const mfaConfirmSchema = z.object({ code: z.string().regex(/^\d{6}$/), setupToken: z.string().uuid() });
const mfaDisableSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  currentPassword: z.string().min(8).max(128),
});
const passwordRateLimit = rateLimit({
  legacyHeaders: false,
  limit: 5,
  message: { code: 'RATE_LIMITED', message: 'Too many password change attempts' },
  standardHeaders: 'draft-8',
  windowMs: 15 * 60 * 1_000,
});
const accountWriteLimit = rateLimit({
  legacyHeaders: false,
  limit: 30,
  message: { code: 'RATE_LIMITED', message: 'Too many account update requests' },
  standardHeaders: 'draft-8',
  windowMs: 60 * 60 * 1_000,
});

function handle(error: unknown, response: Response) {
  if (
    !(error instanceof AccountSecurityError) &&
    !(error instanceof MfaError) &&
    !(error instanceof NotificationError)
  )
    return false;
  response.status(error.status).json({ code: error.code, message: error.code });
  return true;
}

export const accountRouter = Router();
accountRouter.use(requireAuth);
accountRouter.get('/profile', async (request, response, next) => {
  try {
    return response.json(await accountService.getProfile(request.userId ?? ''));
  } catch (error) {
    if (handle(error, response)) return;
    return next(error);
  }
});
accountRouter.patch('/profile', accountWriteLimit, async (request, response, next) => {
  try {
    return response.json(await accountService.updateProfile(request.userId ?? '', profileSchema.parse(request.body)));
  } catch (error) {
    if (handle(error, response)) return;
    return next(error);
  }
});
accountRouter.put('/avatar', accountWriteLimit, async (request, response, next) => {
  try {
    const mimeType = z.enum(['image/jpeg', 'image/png', 'image/webp']).parse(request.get('content-type'));
    if (!Buffer.isBuffer(request.body)) throw new AccountSecurityError('INVALID_AVATAR', 400);
    return response.json(await accountService.updateAvatar(request.userId ?? '', mimeType, request.body));
  } catch (error) {
    if (handle(error, response)) return;
    return next(error);
  }
});
accountRouter.get('/preferences', async (request, response, next) => {
  try {
    return response.json(await accountService.getPreferences(request.userId ?? ''));
  } catch (error) {
    if (handle(error, response)) return;
    return next(error);
  }
});
accountRouter.put('/preferences', accountWriteLimit, async (request, response, next) => {
  try {
    return response.json(
      await accountService.updatePreferences(request.userId ?? '', preferencesSchema.parse(request.body))
    );
  } catch (error) {
    if (handle(error, response)) return;
    return next(error);
  }
});
accountRouter.get('/notifications', async (request, response, next) => {
  try {
    return response.json(await notificationService.list(request.userId ?? ''));
  } catch (error) {
    if (handle(error, response)) return;
    return next(error);
  }
});
accountRouter.patch('/notifications/:notificationId/read', accountWriteLimit, async (request, response, next) => {
  try {
    return response.json(
      await notificationService.markRead(
        request.userId ?? '',
        notificationIdSchema.parse(request.params.notificationId)
      )
    );
  } catch (error) {
    if (handle(error, response)) return;
    return next(error);
  }
});
accountRouter.post('/notifications/read-all', accountWriteLimit, async (request, response, next) => {
  try {
    return response.json(await notificationService.markAllRead(request.userId ?? ''));
  } catch (error) {
    if (handle(error, response)) return;
    return next(error);
  }
});
accountRouter.get('/security', async (request, response, next) => {
  try {
    return response.json(await accountService.getSecurity(request.userId ?? '', request.auth?.sessionId ?? ''));
  } catch (error) {
    if (handle(error, response)) return;
    return next(error);
  }
});
accountRouter.put('/password', passwordRateLimit, async (request, response, next) => {
  try {
    const input = passwordSchema.parse(request.body);
    await accountService.changePassword(
      request.userId ?? '',
      request.auth?.sessionId ?? '',
      input.currentPassword,
      input.newPassword
    );
    return response.status(204).end();
  } catch (error) {
    if (handle(error, response)) return;
    return next(error);
  }
});
accountRouter.delete('/sessions/:sessionId', async (request, response, next) => {
  try {
    await accountService.revokeSession(
      request.userId ?? '',
      request.auth?.sessionId ?? '',
      sessionIdSchema.parse(request.params.sessionId)
    );
    return response.status(204).end();
  } catch (error) {
    if (handle(error, response)) return;
    return next(error);
  }
});
accountRouter.post('/mfa/setup', passwordRateLimit, async (request, response, next) => {
  try {
    const input = mfaSetupSchema.parse(request.body);
    return response.json(await accountService.beginMfaSetup(request.userId ?? '', input.currentPassword));
  } catch (error) {
    if (handle(error, response)) return;
    return next(error);
  }
});
accountRouter.post('/mfa/confirm', passwordRateLimit, async (request, response, next) => {
  try {
    const input = mfaConfirmSchema.parse(request.body);
    return response.json(await accountService.confirmMfaSetup(request.userId ?? '', input.setupToken, input.code));
  } catch (error) {
    if (handle(error, response)) return;
    return next(error);
  }
});
accountRouter.delete('/mfa', passwordRateLimit, async (request, response, next) => {
  try {
    const input = mfaDisableSchema.parse(request.body);
    await accountService.disableMfa(request.userId ?? '', input.currentPassword, input.code);
    return response.status(204).end();
  } catch (error) {
    if (handle(error, response)) return;
    return next(error);
  }
});

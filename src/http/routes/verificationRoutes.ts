import express, { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

import { VerificationError, verificationService } from '../../services/index.js';
import { requireAuth } from '../authMiddleware.js';

const profileSchema = z.object({
  country: z.enum(['AE', 'IR', 'TR']),
  fullName: z.string().trim().min(3).max(120),
  nationalId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{8,32}$/),
});
const documentNameSchema = z.string().trim().min(1).max(180);
const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const writeLimit = rateLimit({
  legacyHeaders: false,
  limit: 12,
  message: { code: 'RATE_LIMITED', message: 'Too many verification requests' },
  standardHeaders: 'draft-8',
  windowMs: 60 * 60 * 1_000,
});

function handle(error: unknown, response: Response) {
  if (!(error instanceof VerificationError)) return false;
  response.status(error.status).json({ code: error.code, message: error.code });
  return true;
}

export const verificationRouter = Router();
verificationRouter.use(requireAuth);
verificationRouter.get('/', (request, response) =>
  response.json(verificationService.get(request.userId ?? ''))
);
verificationRouter.put('/profile', writeLimit, (request, response, next) => {
  try {
    return response.json(
      verificationService.saveProfile(request.userId ?? '', profileSchema.parse(request.body))
    );
  } catch (error) {
    if (handle(error, response)) return;
    return next(error);
  }
});
verificationRouter.post(
  '/document',
  writeLimit,
  express.raw({ limit: '5mb', type: ['application/pdf', 'image/jpeg', 'image/png'] }),
  (request, response, next) => {
    try {
      const mimeType = String(request.header('Content-Type') ?? '').split(';')[0] ?? '';
      if (!allowedMimeTypes.has(mimeType))
        return response
          .status(415)
          .json({ code: 'DOCUMENT_TYPE_UNSUPPORTED', message: 'DOCUMENT_TYPE_UNSUPPORTED' });
      const body = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
      if (body.length < 1)
        return response.status(400).json({ code: 'DOCUMENT_EMPTY', message: 'DOCUMENT_EMPTY' });
      const name = documentNameSchema.parse(decodeURIComponent(request.header('X-Document-Name') ?? ''));
      return response
        .status(201)
        .json(verificationService.saveDocument(request.userId ?? '', { mimeType, name, size: body.length }));
    } catch (error) {
      if (handle(error, response)) return;
      return next(error);
    }
  }
);
verificationRouter.post('/submit', writeLimit, (request, response, next) => {
  try {
    return response.json(verificationService.submit(request.userId ?? ''));
  } catch (error) {
    if (handle(error, response)) return;
    return next(error);
  }
});

import { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

import { BankCardError, bankCardService } from '../../services/index.js';
import { requireAuth } from '../authMiddleware.js';

function validIranianCard(value: string) {
  if (!/^\d{16}$/.test(value) || /^([0-9])\1{15}$/.test(value)) return false;
  const sum = [...value].reduce((total, digit, index) => {
    const product = Number(digit) * (index % 2 === 0 ? 2 : 1);
    return total + (product > 9 ? product - 9 : product);
  }, 0);
  return sum % 10 === 0;
}
function validIban(value: string) {
  if (!/^IR\d{24}$/.test(value)) return false;
  const rearranged = `${value.slice(4)}1827${value.slice(2, 4)}`;
  let remainder = 0;
  for (const digit of rearranged) remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder === 1;
}
const createSchema = z.object({
  iban: z
    .string()
    .transform((value) => value.replace(/\s/g, '').toUpperCase())
    .refine(validIban),
  number: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .refine(validIranianCard),
});
const idSchema = z.string().uuid();
const writeLimit = rateLimit({
  legacyHeaders: false,
  limit: 15,
  message: { code: 'RATE_LIMITED', message: 'Too many card requests' },
  standardHeaders: 'draft-8',
  windowMs: 60 * 60 * 1_000,
});
function handle(error: unknown, response: Response) {
  if (!(error instanceof BankCardError)) return false;
  response.status(error.status).json({ code: error.code, message: error.code });
  return true;
}

export const bankCardRouter = Router();
bankCardRouter.use(requireAuth);
bankCardRouter.get('/', (request, response) => response.json(bankCardService.list(request.userId ?? '')));
bankCardRouter.post('/', writeLimit, (request, response, next) => {
  try {
    const input = createSchema.parse(request.body);
    return response.status(201).json(bankCardService.create(request.userId ?? '', input.number, input.iban));
  } catch (error) {
    if (handle(error, response)) return;
    return next(error);
  }
});
bankCardRouter.delete('/:id', writeLimit, (request, response, next) => {
  try {
    bankCardService.delete(request.userId ?? '', idSchema.parse(request.params.id));
    return response.status(204).end();
  } catch (error) {
    if (handle(error, response)) return;
    return next(error);
  }
});
bankCardRouter.patch('/:id/default', writeLimit, (request, response, next) => {
  try {
    return response.json(bankCardService.setDefault(request.userId ?? '', idSchema.parse(request.params.id)));
  } catch (error) {
    if (handle(error, response)) return;
    return next(error);
  }
});

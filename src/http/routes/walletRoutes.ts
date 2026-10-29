import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';

import { markets } from '../../data/index.js';
import { walletRepository } from '../../repositories/index.js';
import { requireAuth } from '../authMiddleware.js';

const transferSchema = z
  .object({
    asset: z.string().regex(/^[A-Z0-9]{2,12}$/),
    type: z.enum(['deposit', 'withdraw']),
    amount: z.number().positive().max(1_000_000),
    network: z.string().trim().min(2).max(24),
    address: z.string().trim().min(12).max(160).optional(),
  })
  .superRefine((input, context) => {
    if (input.type === 'withdraw' && !input.address) {
      context.addIssue({
        code: 'custom',
        message: 'Destination address is required',
        path: ['address'],
      });
    }
  });
export const walletRouter = Router();
walletRouter.use(requireAuth);
walletRouter.get('/', (request, response) =>
  response.json(
    markets.slice(0, 7).map((market, index) => {
      const balance = walletRepository.getBalance(request.userId ?? '', market.symbol);
      const locked = walletRepository.getLocked(request.userId ?? '', market.symbol);
      return {
        ...market,
        balance,
        available: balance - locked,
        value: balance * market.price,
      };
    })
  )
);
walletRouter.get('/transactions', (request, response) =>
  response.json(walletRepository.listTransactions(request.userId ?? ''))
);
walletRouter.post('/transfers', (request, response, next) => {
  try {
    const input = transferSchema.parse(request.body);
    const marketIndex = markets.findIndex((market) => market.symbol === input.asset);
    if (marketIndex < 0)
      return response.status(404).json({
        code: 'ASSET_NOT_FOUND',
        message: 'Asset is not supported',
      });
    const userId = request.userId ?? '';
    const balance = walletRepository.getBalance(userId, input.asset);
    const locked = walletRepository.getLocked(userId, input.asset);
    if (input.type === 'withdraw' && input.amount > balance - locked) {
      return response.status(409).json({
        code: 'INSUFFICIENT_BALANCE',
        message: 'Amount exceeds the available balance',
      });
    }
    const transaction = walletRepository.createTransaction({
      id: randomUUID(),
      userId,
      asset: input.asset,
      type: input.type,
      amount: input.amount,
      network: input.network,
      ...(input.address
        ? {
            address: input.address,
          }
        : {}),
      status: 'completed',
      createdAt: new Date().toISOString(),
    });
    walletRepository.adjustBalance(
      userId,
      input.asset,
      input.type === 'deposit' ? input.amount : -input.amount
    );
    return response.status(201).json(transaction);
  } catch (error) {
    return next(error);
  }
});

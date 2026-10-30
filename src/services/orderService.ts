import { randomUUID } from 'node:crypto';

import type { OrderRecord } from '../domain/index.js';
import { orderRepository } from '../repositories/index.js';
import { marketService } from './marketService.js';

const feeRate = 0.001;
export class OrderError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}
const round = (value: number) => Math.round((value + Number.EPSILON) * 1e8) / 1e8;
function publicOrder(order: OrderRecord) {
  const {
    userId: _userId,
    idempotencyKey: _key,
    reservedAsset: _asset,
    reservedAmount: _amount,
    ...result
  } = order;
  void _userId;
  void _key;
  void _asset;
  void _amount;
  return result;
}
export const orderService = {
  list: async (userId: string) => (await orderRepository.listByUser(userId)).map(publicOrder),
  async create(
    userId: string,
    input: { symbol: string; side: 'buy' | 'sell'; type: 'limit' | 'market'; price: number; amount: number },
    idempotencyKey: string
  ) {
    const previous = await orderRepository.findByIdempotencyKey(userId, idempotencyKey);
    if (previous) {
      if (
        previous.symbol !== input.symbol ||
        previous.side !== input.side ||
        previous.type !== input.type ||
        previous.price !== input.price ||
        previous.amount !== input.amount
      )
        throw new OrderError('IDEMPOTENCY_KEY_REUSED', 409);
      return publicOrder(previous);
    }
    const market = marketService.snapshot(input.symbol);
    const executionPrice = market.lastPrice;
    const crosses =
      input.type === 'market' ||
      (input.side === 'buy' ? input.price >= executionPrice : input.price <= executionPrice);
    const effectivePrice = crosses ? executionPrice : input.price;
    const quoteAmount = round(input.amount * effectivePrice);
    const feeAmount = round(quoteAmount * feeRate);
    const [base, quote] = input.symbol.split('-') as [string, string];
    const now = new Date().toISOString();
    let reservedAsset: string | undefined;
    let reservedAmount: number | undefined;
    if (!crosses) {
      reservedAsset = input.side === 'buy' ? quote : base;
      reservedAmount = input.side === 'buy' ? quoteAmount + feeAmount : input.amount;
    }
    const result = await orderRepository.createWithSettlement({
        ...input,
        amount: round(input.amount),
        averagePrice: crosses ? executionPrice : 0,
        createdAt: now,
        feeAmount: crosses ? feeAmount : 0,
        filled: crosses ? 100 : 0,
        id: randomUUID(),
        idempotencyKey,
        price: effectivePrice,
        quoteAmount,
        reservedAsset,
        reservedAmount,
        status: crosses ? 'filled' : 'open',
        updatedAt: now,
        userId,
    });
    if (result.kind === 'insufficient_balance') throw new OrderError('INSUFFICIENT_BALANCE', 409);
    if (result.kind === 'existing') {
      const existing = result.order;
      if (existing.symbol !== input.symbol || existing.side !== input.side || existing.type !== input.type || existing.price !== input.price || existing.amount !== input.amount)
        throw new OrderError('IDEMPOTENCY_KEY_REUSED', 409);
    }
    return publicOrder(result.order);
  },
  async cancel(userId: string, id: string) {
    const result = await orderRepository.cancelWithRelease(userId, id, new Date().toISOString());
    if (result.kind === 'not_found') throw new OrderError('ORDER_NOT_FOUND', 404);
    if (result.kind === 'not_open') throw new OrderError('ORDER_NOT_OPEN', 409);
    return publicOrder(result.order);
  },
};

import { randomUUID } from 'node:crypto';

import type { OrderRecord } from '../domain/index.js';
import { orderRepository, walletRepository } from '../repositories/index.js';
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
  list: (userId: string) => orderRepository.listByUser(userId).map(publicOrder),
  create(
    userId: string,
    input: { symbol: string; side: 'buy' | 'sell'; type: 'limit' | 'market'; price: number; amount: number },
    idempotencyKey: string
  ) {
    const previous = orderRepository.findByIdempotencyKey(userId, idempotencyKey);
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
    if (crosses) {
      if (
        !walletRepository.settleTrade(userId, base, quote, input.side, input.amount, quoteAmount, feeAmount)
      )
        throw new OrderError('INSUFFICIENT_BALANCE', 409);
    } else {
      reservedAsset = input.side === 'buy' ? quote : base;
      reservedAmount = input.side === 'buy' ? quoteAmount + feeAmount : input.amount;
      if (!walletRepository.reserve(userId, reservedAsset, reservedAmount))
        throw new OrderError('INSUFFICIENT_BALANCE', 409);
    }
    return publicOrder(
      orderRepository.create({
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
      })
    );
  },
  cancel(userId: string, id: string) {
    const order = orderRepository.findById(id);
    if (!order || order.userId !== userId) throw new OrderError('ORDER_NOT_FOUND', 404);
    if (order.status !== 'open') throw new OrderError('ORDER_NOT_OPEN', 409);
    if (order.reservedAsset && order.reservedAmount)
      walletRepository.release(userId, order.reservedAsset, order.reservedAmount);
    const updated = orderRepository.update(id, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
      reservedAmount: 0,
    });
    if (!updated) throw new OrderError('ORDER_NOT_FOUND', 404);
    return publicOrder(updated);
  },
};

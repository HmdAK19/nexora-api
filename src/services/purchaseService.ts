import { randomUUID } from 'node:crypto';

import { markets } from '../data/index.js';
import type { PurchaseOrderRecord, PurchaseQuoteRecord } from '../domain/index.js';
import { purchaseRepository, walletRepository } from '../repositories/index.js';

const supportedAssets = new Set(['BTC', 'ETH', 'USDT']);
const quoteLifetimeMs = 20_000;
const feeRate = 0.005;

export class PurchaseError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function publicQuote(quote: PurchaseQuoteRecord) {
  const { userId: _userId, consumedAt: _consumedAt, ...result } = quote;
  void _userId;
  void _consumedAt;
  return result;
}

function publicOrder(order: PurchaseOrderRecord) {
  const { userId: _userId, idempotencyKey: _idempotencyKey, quoteId: _quoteId, ...result } = order;
  void _userId;
  void _idempotencyKey;
  void _quoteId;
  return result;
}

export const purchaseService = {
  createQuote(userId: string, asset: string, fiatAmount: number) {
    if (!supportedAssets.has(asset)) {
      throw new PurchaseError('ASSET_NOT_SUPPORTED', 400);
    }

    const market = markets.find((item) => item.symbol === asset);

    if (!market) {
      throw new PurchaseError('ASSET_NOT_SUPPORTED', 400);
    }

    const feeAmount = round(fiatAmount * feeRate, 2);
    const quote = purchaseRepository.createQuote({
      id: randomUUID(),
      userId,
      asset,
      assetAmount: round(fiatAmount / market.price, 8),
      expiresAt: new Date(Date.now() + quoteLifetimeMs).toISOString(),
      feeAmount,
      fiatAmount,
      fiatCurrency: 'USD',
      totalAmount: round(fiatAmount + feeAmount, 2),
      unitPrice: market.price,
    });

    return publicQuote(quote);
  },

  executeQuote(userId: string, quoteId: string, idempotencyKey: string) {
    const previousOrder = purchaseRepository.findOrderByIdempotencyKey(userId, idempotencyKey);

    if (previousOrder) {
      if (previousOrder.quoteId !== quoteId) {
        throw new PurchaseError('IDEMPOTENCY_KEY_REUSED', 409);
      }

      return publicOrder(previousOrder);
    }

    const quote = purchaseRepository.findQuoteById(quoteId);

    if (!quote || quote.userId !== userId) {
      throw new PurchaseError('QUOTE_NOT_FOUND', 404);
    }

    if (Date.parse(quote.expiresAt) <= Date.now()) {
      throw new PurchaseError('QUOTE_EXPIRED', 410);
    }

    if (walletRepository.getBalance(userId, 'USD') < quote.totalAmount) {
      throw new PurchaseError('INSUFFICIENT_BALANCE', 409);
    }

    const consumedAt = new Date().toISOString();

    if (!purchaseRepository.consumeQuote(quote.id, consumedAt)) {
      throw new PurchaseError('QUOTE_ALREADY_USED', 409);
    }

    const order = purchaseRepository.createOrder({
      id: randomUUID(),
      userId,
      asset: quote.asset,
      assetAmount: quote.assetAmount,
      createdAt: consumedAt,
      fiatAmount: quote.fiatAmount,
      fiatCurrency: quote.fiatCurrency,
      idempotencyKey,
      quoteId: quote.id,
      status: 'completed',
    });

    const settled = walletRepository.settlePurchase(
      userId,
      quote.totalAmount,
      quote.asset,
      quote.assetAmount
    );

    if (!settled) {
      throw new PurchaseError('INSUFFICIENT_BALANCE', 409);
    }

    return publicOrder(order);
  },

  getOrder(userId: string, orderId: string) {
    const order = purchaseRepository.findOrderById(orderId);

    if (!order || order.userId !== userId) {
      throw new PurchaseError('PURCHASE_NOT_FOUND', 404);
    }

    return publicOrder(order);
  },
};

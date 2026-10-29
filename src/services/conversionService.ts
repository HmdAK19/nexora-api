import { randomUUID } from 'node:crypto';

import { markets } from '../data/index.js';
import type { ConversionOrderRecord, ConversionQuoteRecord } from '../domain/index.js';
import { conversionRepository, walletRepository } from '../repositories/index.js';

const supportedAssets = new Set(['BTC', 'ETH', 'USDT', 'SOL']);
const quoteLifetimeMs = 20_000;
const feeRate = 0.001;

export class ConversionError extends Error {
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

function publicQuote(quote: ConversionQuoteRecord) {
  const { userId: _userId, consumedAt: _consumedAt, ...result } = quote;
  void _userId;
  void _consumedAt;
  return result;
}

function publicOrder(order: ConversionOrderRecord) {
  const { userId: _userId, idempotencyKey: _idempotencyKey, quoteId: _quoteId, ...result } = order;
  void _userId;
  void _idempotencyKey;
  void _quoteId;
  return result;
}

function priceOf(asset: string) {
  const market = markets.find((item) => item.symbol === asset);

  if (!market) throw new ConversionError('ASSET_NOT_SUPPORTED', 400);

  return market.price;
}

export const conversionService = {
  createQuote(userId: string, fromAsset: string, toAsset: string, sourceAmount: number) {
    if (!supportedAssets.has(fromAsset) || !supportedAssets.has(toAsset) || fromAsset === toAsset) {
      throw new ConversionError('PAIR_NOT_SUPPORTED', 400);
    }

    const feeAmount = round(sourceAmount * feeRate, 8);
    const netSourceAmount = sourceAmount - feeAmount;
    const rate = priceOf(fromAsset) / priceOf(toAsset);
    const destinationAmount = round(netSourceAmount * rate, 8);

    if (destinationAmount <= 0) throw new ConversionError('AMOUNT_TOO_SMALL', 422);

    const quote = conversionRepository.createQuote({
      id: randomUUID(),
      userId,
      destinationAmount,
      expiresAt: new Date(Date.now() + quoteLifetimeMs).toISOString(),
      feeAmount,
      fromAsset,
      rate: round(rate, 8),
      sourceAmount,
      toAsset,
    });

    return publicQuote(quote);
  },

  executeQuote(userId: string, quoteId: string, idempotencyKey: string) {
    const previousOrder = conversionRepository.findOrderByIdempotencyKey(userId, idempotencyKey);

    if (previousOrder) {
      if (previousOrder.quoteId !== quoteId) {
        throw new ConversionError('IDEMPOTENCY_KEY_REUSED', 409);
      }

      return publicOrder(previousOrder);
    }

    const quote = conversionRepository.findQuoteById(quoteId);

    if (!quote || quote.userId !== userId) throw new ConversionError('QUOTE_NOT_FOUND', 404);
    if (Date.parse(quote.expiresAt) <= Date.now()) throw new ConversionError('QUOTE_EXPIRED', 410);
    if (walletRepository.getBalance(userId, quote.fromAsset) < quote.sourceAmount) {
      throw new ConversionError('INSUFFICIENT_BALANCE', 409);
    }

    const createdAt = new Date().toISOString();

    if (!conversionRepository.consumeQuote(quote.id, createdAt)) {
      throw new ConversionError('QUOTE_ALREADY_USED', 409);
    }

    if (
      !walletRepository.settleConversion(
        userId,
        quote.fromAsset,
        quote.sourceAmount,
        quote.toAsset,
        quote.destinationAmount
      )
    ) {
      throw new ConversionError('INSUFFICIENT_BALANCE', 409);
    }

    return publicOrder(
      conversionRepository.createOrder({
        id: randomUUID(),
        userId,
        createdAt,
        destinationAmount: quote.destinationAmount,
        fromAsset: quote.fromAsset,
        idempotencyKey,
        quoteId: quote.id,
        sourceAmount: quote.sourceAmount,
        status: 'completed',
        toAsset: quote.toAsset,
      })
    );
  },

  getOrder(userId: string, orderId: string) {
    const order = conversionRepository.findOrderById(orderId);

    if (!order || order.userId !== userId) throw new ConversionError('CONVERSION_NOT_FOUND', 404);

    return publicOrder(order);
  },
};

import { Router } from 'express';
import { z } from 'zod';

import { markets } from '../../data/index.js';
import { MarketError, marketService } from '../../services/index.js';
import { requireAuth } from '../authMiddleware.js';

export const marketRouter = Router();
marketRouter.use(requireAuth);
marketRouter.get('/', (request, response) => {
  const page = Math.max(1, Number(request.query.page ?? 1));
  const pageSize = Math.min(50, Math.max(10, Number(request.query.pageSize ?? 25)));
  const search = String(request.query.search ?? '')
    .toLowerCase()
    .trim();
  const filtered = search
    ? markets.filter((market) => `${market.symbol} ${market.name}`.toLowerCase().includes(search))
    : markets;
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);
  return response.json({
    data,
    page,
    pageSize,
    total: filtered.length,
    hasMore: start + pageSize < filtered.length,
  });
});
marketRouter.get('/featured', (_request, response) => response.json(markets.slice(0, 5)));
const symbolSchema = z.string().regex(/^[A-Z0-9]{2,12}-[A-Z0-9]{2,12}$/);
const timeframeSchema = z.enum(['1m', '5m', '15m', '1h', '4h', '1D']);

marketRouter.get('/:symbol/trading', async (request, response, next) => {
  try {
    const symbol = symbolSchema.parse(request.params.symbol);
    return response.json(await marketService.liveSnapshot(symbol));
  } catch (error) {
    if (error instanceof MarketError) {
      return response.status(error.status).json({ code: error.code, message: error.code });
    }
    return next(error);
  }
});

marketRouter.get('/:symbol/candles', async (request, response, next) => {
  try {
    const symbol = symbolSchema.parse(request.params.symbol);
    const timeframe = timeframeSchema.parse(request.query.timeframe ?? '15m');
    const limit = z.coerce
      .number()
      .int()
      .min(28)
      .max(500)
      .parse(request.query.limit ?? 110);
    return response.json(await marketService.liveCandles(symbol, timeframe, limit));
  } catch (error) {
    if (error instanceof MarketError) {
      return response.status(error.status).json({ code: error.code, message: error.code });
    }
    return next(error);
  }
});

marketRouter.get('/:symbol/trades', async (request, response, next) => {
  try {
    const symbol = symbolSchema.parse(request.params.symbol);
    const limit = z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .parse(request.query.limit ?? 30);

    return response.json(await marketService.recentTrades(symbol, limit));
  } catch (error) {
    if (error instanceof MarketError) {
      return response.status(error.status).json({ code: error.code, message: error.code });
    }

    return next(error);
  }
});

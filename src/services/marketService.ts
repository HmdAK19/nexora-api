import { markets } from '../data/index.js';

import { marketDataProvider } from './marketDataProvider.js';

const timeframeMinutes = { '1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1D': 1_440 } as const;
export type MarketTimeframe = keyof typeof timeframeMinutes;

export class MarketError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}

function marketFor(pair: string) {
  const [base, quote] = pair.split('-');
  const market = markets.find((item) => item.symbol === base && item.quote === quote);

  if (!market) throw new MarketError('MARKET_NOT_FOUND', 404);

  return market;
}

function precision(value: number) {
  return value < 1 ? 8 : 2;
}

export const marketService = {
  snapshot(pair: string) {
    const market = marketFor(pair);
    const high24h = market.price * (1 + Math.max(market.change24h, 1) / 100);
    const low24h = market.price * (1 - Math.max(-market.change24h, 1) / 100);

    return {
      baseAsset: market.symbol,
      change24h: market.change24h,
      high24h: Number(high24h.toFixed(precision(high24h))),
      lastPrice: market.price,
      low24h: Number(low24h.toFixed(precision(low24h))),
      name: market.name,
      quoteAsset: market.quote,
      symbol: pair,
      volume24h: market.volume24h,
    };
  },

  candles(pair: string, timeframe: MarketTimeframe, limit: number) {
    const market = marketFor(pair);
    const stepMs = timeframeMinutes[timeframe] * 60_000;
    const end = Math.floor(Date.now() / stepMs) * stepMs;
    let previous = market.price * (1 - market.change24h / 200);

    return Array.from({ length: limit }, (_, index) => {
      const position = index - limit + 1;
      const wave = Math.sin((index + market.symbol.length) * 0.47) * 0.0025;
      const trend = (market.change24h / 100 / Math.max(limit, 1)) * index;
      const open = previous;
      const close = market.price * (1 + trend + wave * 0.35);
      const spread = market.price * (0.0012 + Math.abs(Math.cos(index * 0.61)) * 0.0018);
      previous = close;

      return {
        close: Number(close.toFixed(precision(close))),
        high: Number((Math.max(open, close) + spread).toFixed(precision(close))),
        low: Number((Math.min(open, close) - spread).toFixed(precision(close))),
        open: Number(open.toFixed(precision(open))),
        time: end + position * stepMs,
        volume: Number((market.volume24h / limit / 24) * (0.7 + Math.abs(Math.sin(index)) * 0.6)),
      };
    });
  },

  depth(pair: string, limit: number) {
    const market = marketFor(pair);
    const tick = market.price < 1 ? market.price * 0.0008 : market.price * 0.00015;
    const makeLevels = (side: 'ask' | 'bid') =>
      Array.from({ length: limit }, (_, index) => {
        const price = market.price + (side === 'ask' ? 1 : -1) * tick * (index + 1);
        const amount = (market.volume24h / market.price / 100_000) * (0.6 + ((index * 13) % 17) / 10);

        return { amount: Number(amount.toFixed(6)), price: Number(price.toFixed(precision(price))) };
      });

    return {
      asks: makeLevels('ask').reverse(),
      bids: makeLevels('bid'),
      sequence: Math.floor(Date.now() / 1_000),
      symbol: pair,
    };
  },

  async liveSnapshot(pair: string) {
    const market = marketFor(pair);
    const [ticker, depth] = await Promise.all([
      marketDataProvider.ticker(pair),
      marketDataProvider.depth(pair, 20),
    ]);

    return {
      baseAsset: market.symbol,
      change24h: ticker.change24h,
      depth: { ...depth, symbol: pair },
      high24h: ticker.high24h,
      lastPrice: ticker.lastPrice,
      low24h: ticker.low24h,
      name: market.name,
      quoteAsset: market.quote,
      symbol: pair,
      volume24h: ticker.volume24h,
    };
  },

  liveCandles(pair: string, timeframe: MarketTimeframe, limit: number) {
    marketFor(pair);

    return marketDataProvider.candles(pair, timeframe, limit);
  },

  recentTrades(pair: string, limit: number) {
    marketFor(pair);

    return marketDataProvider.recentTrades(pair, limit);
  },
};

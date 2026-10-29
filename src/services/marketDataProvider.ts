import WebSocket from 'ws';
import { z } from 'zod';

import { config } from '../config.js';

import type { MarketTimeframe } from './marketService.js';

export interface MarketTicker {
  change24h: number;
  high24h: number;
  lastPrice: number;
  low24h: number;
  timestamp: number;
  volume24h: number;
}

export interface MarketDepth {
  asks: Array<{ amount: number; price: number }>;
  bids: Array<{ amount: number; price: number }>;
  sequence: number;
}

export interface MarketCandle {
  close: number;
  high: number;
  low: number;
  open: number;
  time: number;
  volume: number;
}

export interface RecentMarketTrade {
  amount: number;
  id: number;
  price: number;
  side: 'buy' | 'sell';
  time: number;
}

export interface MarketDataProvider {
  candles(pair: string, timeframe: MarketTimeframe, limit: number): Promise<MarketCandle[]>;
  depth(pair: string, limit: number): Promise<MarketDepth>;
  openTickerStream(
    pair: string,
    handlers: { onError: (error: Error) => void; onTick: (ticker: MarketTicker) => void }
  ): () => void;
  recentTrades(pair: string, limit: number): Promise<RecentMarketTrade[]>;
  ticker(pair: string): Promise<MarketTicker>;
}

const numericString = z.string().transform((value, context) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    context.addIssue({ code: 'custom', message: 'Expected a finite numeric string' });

    return z.NEVER;
  }

  return number;
});

const streamTickerSchema = z.object({
  E: z.number().optional(),
  P: numericString,
  c: numericString,
  h: numericString,
  l: numericString,
  q: numericString,
});

const restTickerSchema = z.object({
  closeTime: z.number(),
  highPrice: numericString,
  lastPrice: numericString,
  lowPrice: numericString,
  priceChangePercent: numericString,
  quoteVolume: numericString,
});

const depthSchema = z.object({
  asks: z.array(z.tuple([numericString, numericString])),
  bids: z.array(z.tuple([numericString, numericString])),
  lastUpdateId: z.number(),
});

const recentTradeSchema = z.object({
  id: z.number(),
  isBuyerMaker: z.boolean(),
  price: numericString,
  qty: numericString,
  time: z.number(),
});

const timeframeMap: Record<MarketTimeframe, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1D': '1d',
};

function providerSymbol(pair: string) {
  return pair.replace('-', '').toUpperCase();
}

function parseStreamTicker(value: unknown): MarketTicker {
  const ticker = streamTickerSchema.parse(value);

  return {
    change24h: ticker.P,
    high24h: ticker.h,
    lastPrice: ticker.c,
    low24h: ticker.l,
    timestamp: ticker.E ?? Date.now(),
    volume24h: ticker.q,
  };
}

function parseRestTicker(value: unknown): MarketTicker {
  const ticker = restTickerSchema.parse(value);

  return {
    change24h: ticker.priceChangePercent,
    high24h: ticker.highPrice,
    lastPrice: ticker.lastPrice,
    low24h: ticker.lowPrice,
    timestamp: ticker.closeTime,
    volume24h: ticker.quoteVolume,
  };
}

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(`${config.marketDataRestUrl}${path}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(config.marketDataTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Market provider request failed with status ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}

export class BinanceMarketDataProvider implements MarketDataProvider {
  async ticker(pair: string): Promise<MarketTicker> {
    const symbol = encodeURIComponent(providerSymbol(pair));

    return parseRestTicker(await fetchJson(`/api/v3/ticker/24hr?symbol=${symbol}`));
  }

  async depth(pair: string, limit: number): Promise<MarketDepth> {
    const symbol = encodeURIComponent(providerSymbol(pair));
    const depth = depthSchema.parse(
      await fetchJson(`/api/v3/depth?symbol=${symbol}&limit=${encodeURIComponent(String(limit))}`)
    );
    const toLevel = ([price, amount]: [number, number]) => ({ amount, price });

    return {
      asks: depth.asks.map(toLevel),
      bids: depth.bids.map(toLevel),
      sequence: depth.lastUpdateId,
    };
  }

  async candles(pair: string, timeframe: MarketTimeframe, limit: number): Promise<MarketCandle[]> {
    const symbol = encodeURIComponent(providerSymbol(pair));
    const interval = timeframeMap[timeframe];
    const payload = z
      .array(z.array(z.unknown()).min(6))
      .parse(
        await fetchJson(
          `/api/v3/klines?symbol=${symbol}&interval=${encodeURIComponent(interval)}&limit=${encodeURIComponent(String(limit))}`
        )
      );

    return payload.map((row) => {
      const [time, open, high, low, close, volume] = row;
      const candle = z
        .tuple([z.number(), numericString, numericString, numericString, numericString, numericString])
        .parse([time, open, high, low, close, volume]);

      return {
        time: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
      };
    });
  }

  async recentTrades(pair: string, limit: number): Promise<RecentMarketTrade[]> {
    const symbol = encodeURIComponent(providerSymbol(pair));
    const trades = z
      .array(recentTradeSchema)
      .parse(await fetchJson(`/api/v3/trades?symbol=${symbol}&limit=${encodeURIComponent(String(limit))}`));

    return trades.map((trade) => ({
      amount: trade.qty,
      id: trade.id,
      price: trade.price,
      side: trade.isBuyerMaker ? 'sell' : 'buy',
      time: trade.time,
    }));
  }

  openTickerStream(
    pair: string,
    handlers: { onError: (error: Error) => void; onTick: (ticker: MarketTicker) => void }
  ): () => void {
    const stream = `${providerSymbol(pair).toLowerCase()}@ticker`;
    const socket = new WebSocket(`${config.marketDataStreamUrl}/${stream}`);

    socket.on('message', (message) => {
      try {
        handlers.onTick(parseStreamTicker(JSON.parse(message.toString()) as unknown));
      } catch (error) {
        handlers.onError(error instanceof Error ? error : new Error('Invalid market stream payload'));
      }
    });
    socket.on('error', (error) => handlers.onError(error));

    return () => socket.close();
  }
}

export const marketDataProvider: MarketDataProvider = new BinanceMarketDataProvider();

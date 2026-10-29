import { Router } from 'express';

import { requireAuth } from '../authMiddleware.js';

export const dashboardRouter = Router();
dashboardRouter.get('/', requireAuth, (_request, response) =>
  response.json({
    portfolioValue: 89247.63,
    portfolioChange: 8.24,
    availableBalance: 24320.5,
    openOrders: 6,
    totalTrades: 1248,
    allocation: [
      {
        symbol: 'BTC',
        value: 43910,
        color: '#f7931a',
      },
      {
        symbol: 'ETH',
        value: 25174,
        color: '#627eea',
      },
      {
        symbol: 'SOL',
        value: 11322,
        color: '#20d6c7',
      },
      {
        symbol: 'Other',
        value: 8841,
        color: '#9a69ff',
      },
    ],
    performance: [
      31, 34, 32, 38, 37, 42, 47, 44, 49, 52, 48, 57, 55, 62, 59, 68, 65, 72, 70, 76, 82, 78, 85, 89, 86, 94,
      91, 97, 103, 108,
    ],
    activities: [
      {
        id: 'act-1',
        title: 'Bought 0.042 BTC',
        subtitle: 'Today · BTC/USDT',
        amount: -2849.38,
        kind: 'buy',
      },
      {
        id: 'act-2',
        title: 'USDT deposit',
        subtitle: 'Yesterday · TRC20',
        amount: 5000,
        kind: 'deposit',
      },
      {
        id: 'act-3',
        title: 'Sold 8.4 SOL',
        subtitle: 'Oct 17 · SOL/USDT',
        amount: 1497.8,
        kind: 'sell',
      },
      {
        id: 'act-4',
        title: 'Bought 1.2 ETH',
        subtitle: 'Oct 16 · ETH/USDT',
        amount: -4210.16,
        kind: 'buy',
      },
    ],
  })
);

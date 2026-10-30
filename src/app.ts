import { createServer } from 'node:http';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { WebSocketServer } from 'ws';

import { config } from './config.js';
import { PERMISSIONS, type Permission } from './domain/index.js';
import {
  accountRouter,
  adminRouter,
  authRouter,
  bankCardRouter,
  buyRouter,
  conversionRouter,
  dashboardRouter,
  errorHandler,
  marketRouter,
  orderRouter,
  referralRouter,
  requireAuth,
  requirePermission,
  supportRouter,
  walletRouter,
  verificationRouter,
} from './http/index.js';
import { marketDataProvider } from './services/index.js';

const authorize = (permission: Permission) => [requireAuth, requirePermission(permission)] as const;
const createHelmetMiddleware = helmet as unknown as () => express.RequestHandler;

export const createApp = () => {
  const app = express();
  app.disable('x-powered-by');
  app.use(createHelmetMiddleware());
  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
    })
  );
  app.use(
    '/api/account/avatar',
    express.raw({ limit: '1mb', type: ['image/jpeg', 'image/png', 'image/webp'] })
  );
  app.use(
    express.json({
      limit: '200kb',
    })
  );
  app.use(cookieParser());
  app.get('/api/health', (_request, response) =>
    response.json({
      status: 'ok',
      time: new Date().toISOString(),
    })
  );
  app.use('/api/auth', authRouter);
  app.use('/api/account', requireAuth, accountRouter);
  app.use('/api/admin', requireAuth, adminRouter);
  app.use('/api/cards', ...authorize(PERMISSIONS.cards), bankCardRouter);
  app.use('/api/buy', ...authorize(PERMISSIONS.purchase), buyRouter);
  app.use('/api/convert', ...authorize(PERMISSIONS.convert), conversionRouter);
  app.use('/api/dashboard', ...authorize(PERMISSIONS.dashboard), dashboardRouter);
  app.use('/api/markets', ...authorize(PERMISSIONS.markets), marketRouter);
  app.use('/api/orders', ...authorize(PERMISSIONS.orders), orderRouter);
  app.use('/api/referrals', ...authorize(PERMISSIONS.referrals), referralRouter);
  app.use('/api/support', ...authorize(PERMISSIONS.support), supportRouter);
  app.use('/api/wallet', ...authorize(PERMISSIONS.wallet), walletRouter);
  app.use('/api/verification', ...authorize(PERMISSIONS.verification), verificationRouter);
  app.use(errorHandler);
  return app;
};

const server = createServer(createApp());
const webSocketServer = new WebSocketServer({ server });

webSocketServer.on('connection', (socket, request) => {
  const url = new URL(request.url ?? '/ws', `http://${request.headers.host ?? 'localhost'}`);

  if (url.pathname !== '/ws' && url.pathname !== '/api/ws') {
    return socket.close(1008, 'Invalid path');
  }

  const pair = url.searchParams.get('symbol') ?? 'BTC-USDT';

  if (!/^[A-Z0-9]{2,12}-[A-Z0-9]{2,12}$/.test(pair)) {
    return socket.close(1008, 'Invalid market');
  }

  const closeUpstream = marketDataProvider.openTickerStream(pair, {
    onTick: (ticker) => {
      if (socket.readyState !== socket.OPEN) return;

      socket.send(
        JSON.stringify({
          symbol: pair,
          price: ticker.lastPrice,
          change24h: ticker.change24h,
          timestamp: ticker.timestamp,
        })
      );
    },
    onError: () => socket.close(1011, 'Market provider unavailable'),
  });

  socket.on('close', closeUpstream);
});

export default server;

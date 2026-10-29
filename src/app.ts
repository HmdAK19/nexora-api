import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { config } from './config.js';
import { PERMISSIONS, type Permission } from './domain/index.js';
import {
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

const authorize = (permission: Permission) => [requireAuth, requirePermission(permission)] as const;

export const createApp = () => {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
    })
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

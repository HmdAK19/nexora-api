// @vitest-environment node
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from './app.js';
import { walletRepository } from './repositories/index.js';
import { generateTotp } from './services/index.js';

describe('Nexora API', () => {
  it('reports a healthy service', async () => {
    const response = await request(createApp()).get('/api/health').expect(200);
    expect(response.body.status).toBe('ok');
  });
  it('rejects invalid login data without leaking account state', async () => {
    const response = await request(createApp())
      .post('/api/auth/login')
      .send({
        email: 'demo@nexora.dev',
        password: 'incorrect-password',
      })
      .expect(401);
    expect(response.body.code).toBe('INVALID_CREDENTIALS');
  });
  it('issues a refresh cookie and access token for the demo account', async () => {
    const response = await request(createApp())
      .post('/api/auth/login')
      .send({
        email: 'demo@nexora.dev',
        password: 'Nexora123!',
      })
      .expect(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      role: 'admin',
      permissions: expect.arrayContaining(['admin:overview:read', 'admin:settings:manage']),
    });
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
  });
  it('enforces administration permission on the server', async () => {
    const app = createApp();
    const customerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@nexora.dev', password: 'Nexora123!' })
      .expect(200);
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@nexora.dev', password: 'Nexora123!' })
      .expect(200);

    const denied = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${String(customerLogin.body.accessToken)}`)
      .expect(403);

    expect(denied.body).toEqual({
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action',
    });

    const allowed = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${String(adminLogin.body.accessToken)}`)
      .expect(200);

    expect(allowed.body).toHaveProperty('metrics');
  });
  it('persists validated administration settings and records an audit event', async () => {
    const app = createApp();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@nexora.dev', password: 'Nexora123!' })
      .expect(200);
    const authorization = `Bearer ${String(login.body.accessToken)}`;
    const input = {
      minimumWithdrawal: 25,
      networkEnabled: true,
      paymentProvider: 'provider-a',
      tradingFeePercent: 0.12,
      withdrawalsEnabled: false,
    };

    const updated = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', authorization)
      .send(input)
      .expect(200);

    expect(updated.body).toMatchObject(input);

    const current = await request(app)
      .get('/api/admin/settings')
      .set('Authorization', authorization)
      .expect(200);

    expect(current.body).toMatchObject(input);

    const audit = await request(app)
      .get('/api/admin/audit-events')
      .set('Authorization', authorization)
      .expect(200);

    expect(audit.body[0]).toMatchObject({
      action: 'settings.update',
      actorId: 'user-demo',
      targetId: 'global',
      targetType: 'admin-settings',
    });
  });
  it('records a demo wallet deposit and updates the balance', async () => {
    const app = createApp();
    const login = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'demo@nexora.dev',
        password: 'Nexora123!',
      })
      .expect(200);
    const authorization = `Bearer ${String(login.body.accessToken)}`;
    const before = await request(app).get('/api/wallet').set('Authorization', authorization).expect(200);
    const beforeUsdt = before.body.find((asset: { symbol: string }) => asset.symbol === 'USDT') as {
      balance: number;
    };
    const transfer = await request(app)
      .post('/api/wallet/transfers')
      .set('Authorization', authorization)
      .send({
        asset: 'USDT',
        type: 'deposit',
        amount: 25.25,
        network: 'TRC20',
      })
      .expect(201);
    expect(transfer.body).toMatchObject({
      asset: 'USDT',
      type: 'deposit',
      amount: 25.25,
      status: 'completed',
    });
    const after = await request(app).get('/api/wallet').set('Authorization', authorization).expect(200);
    const afterUsdt = after.body.find((asset: { symbol: string }) => asset.symbol === 'USDT') as {
      balance: number;
    };
    expect(afterUsdt.balance).toBeCloseTo(beforeUsdt.balance + 25.25);
    const history = await request(app)
      .get('/api/wallet/transactions')
      .set('Authorization', authorization)
      .expect(200);
    expect(history.body[0].id).toBe(transfer.body.id);
  });
  it('rejects withdrawals above the available wallet balance', async () => {
    const app = createApp();
    const login = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'demo@nexora.dev',
        password: 'Nexora123!',
      })
      .expect(200);
    const response = await request(app)
      .post('/api/wallet/transfers')
      .set('Authorization', `Bearer ${String(login.body.accessToken)}`)
      .send({
        asset: 'BTC',
        type: 'withdraw',
        amount: 999999,
        network: 'Bitcoin',
        address: 'bc1q-test-destination-address',
      })
      .expect(409);
    expect(response.body.code).toBe('INSUFFICIENT_BALANCE');
  });
  it('executes a server-priced purchase exactly once for an idempotency key', async () => {
    const app = createApp();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@nexora.dev', password: 'Nexora123!' })
      .expect(200);
    const authorization = `Bearer ${String(login.body.accessToken)}`;
    const beforeUsd = await walletRepository.getBalance('user-demo', 'USD');
    const before = await request(app).get('/api/wallet').set('Authorization', authorization).expect(200);
    const beforeBtc = before.body.find((asset: { symbol: string }) => asset.symbol === 'BTC') as {
      balance: number;
    };
    const quote = await request(app)
      .post('/api/buy/quotes')
      .set('Authorization', authorization)
      .send({ asset: 'BTC', fiatAmount: 1000, fiatCurrency: 'USD' })
      .expect(201);
    const idempotencyKey = 'test-idempotency-key-0001';
    const [first, retry] = await Promise.all([
      request(app)
        .post('/api/buy/orders')
        .set('Authorization', authorization)
        .set('Idempotency-Key', idempotencyKey)
        .send({ quoteId: quote.body.id })
        .expect(201),
      request(app)
        .post('/api/buy/orders')
        .set('Authorization', authorization)
        .set('Idempotency-Key', idempotencyKey)
        .send({ quoteId: quote.body.id })
        .expect(201),
    ]);

    expect(first.body).toMatchObject({ asset: 'BTC', status: 'completed' });
    expect(retry.body.id).toBe(first.body.id);

    const after = await request(app).get('/api/wallet').set('Authorization', authorization).expect(200);
    const afterBtc = after.body.find((asset: { symbol: string }) => asset.symbol === 'BTC') as {
      balance: number;
    };
    expect(afterBtc.balance).toBeCloseTo(beforeBtc.balance + Number(first.body.assetAmount));
    expect(await walletRepository.getBalance('user-demo', 'USD')).toBe(beforeUsd - Number(quote.body.totalAmount));
  });
  it('settles an asset conversion exactly once for an idempotency key', async () => {
    const app = createApp();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@nexora.dev', password: 'Nexora123!' })
      .expect(200);
    const authorization = `Bearer ${String(login.body.accessToken)}`;
    const beforeUsdt = await walletRepository.getBalance('user-demo', 'USDT');
    const beforeEth = await walletRepository.getBalance('user-demo', 'ETH');
    const quote = await request(app)
      .post('/api/convert/quotes')
      .set('Authorization', authorization)
      .send({ fromAsset: 'USDT', sourceAmount: 100, toAsset: 'ETH' })
      .expect(201);
    const idempotencyKey = 'conversion-test-key-0001';
    const first = await request(app)
      .post('/api/convert/orders')
      .set('Authorization', authorization)
      .set('Idempotency-Key', idempotencyKey)
      .send({ quoteId: quote.body.id })
      .expect(201);
    const retry = await request(app)
      .post('/api/convert/orders')
      .set('Authorization', authorization)
      .set('Idempotency-Key', idempotencyKey)
      .send({ quoteId: quote.body.id })
      .expect(201);

    expect(first.body).toMatchObject({ fromAsset: 'USDT', status: 'completed', toAsset: 'ETH' });
    expect(retry.body.id).toBe(first.body.id);
    expect(await walletRepository.getBalance('user-demo', 'USDT')).toBeCloseTo(beforeUsdt - 100);
    expect(await walletRepository.getBalance('user-demo', 'ETH')).toBeCloseTo(
      beforeEth + Number(first.body.destinationAmount)
    );
  });
  it('rejects a conversion above the available source balance without mutating balances', async () => {
    const app = createApp();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@nexora.dev', password: 'Nexora123!' })
      .expect(200);
    const authorization = `Bearer ${String(login.body.accessToken)}`;
    const beforeBtc = await walletRepository.getBalance('user-demo', 'BTC');
    const beforeEth = await walletRepository.getBalance('user-demo', 'ETH');
    const quote = await request(app)
      .post('/api/convert/quotes')
      .set('Authorization', authorization)
      .send({ fromAsset: 'BTC', sourceAmount: 100, toAsset: 'ETH' })
      .expect(201);
    const response = await request(app)
      .post('/api/convert/orders')
      .set('Authorization', authorization)
      .set('Idempotency-Key', 'conversion-insufficient-0001')
      .send({ quoteId: quote.body.id })
      .expect(409);

    expect(response.body.code).toBe('INSUFFICIENT_BALANCE');
    expect(await walletRepository.getBalance('user-demo', 'BTC')).toBe(beforeBtc);
    expect(await walletRepository.getBalance('user-demo', 'ETH')).toBe(beforeEth);
  });
  it('creates, replies to, lists and closes an owned support ticket', async () => {
    const app = createApp();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@nexora.dev', password: 'Nexora123!' })
      .expect(200);
    const authorization = `Bearer ${String(login.body.accessToken)}`;
    const created = await request(app)
      .post('/api/support/tickets')
      .set('Authorization', authorization)
      .send({
        category: 'wallet',
        message: 'My deposit has not appeared in my wallet yet.',
        subject: 'Missing wallet deposit',
      })
      .expect(201);

    expect(created.body).toMatchObject({
      category: 'wallet',
      status: 'waiting_for_support',
      subject: 'Missing wallet deposit',
    });
    expect(created.body.messages).toHaveLength(1);

    const replied = await request(app)
      .post(`/api/support/tickets/${String(created.body.id)}/messages`)
      .set('Authorization', authorization)
      .send({ message: 'The transaction hash is available if support needs it.' })
      .expect(201);

    expect(replied.body.messages).toHaveLength(2);

    const listed = await request(app)
      .get('/api/support/tickets')
      .set('Authorization', authorization)
      .expect(200);

    expect(listed.body[0].id).toBe(created.body.id);
    expect(listed.body[0]).not.toHaveProperty('messages');

    const closed = await request(app)
      .patch(`/api/support/tickets/${String(created.body.id)}/close`)
      .set('Authorization', authorization)
      .expect(200);

    expect(closed.body.status).toBe('closed');

    const rejectedReply = await request(app)
      .post(`/api/support/tickets/${String(created.body.id)}/messages`)
      .set('Authorization', authorization)
      .send({ message: 'This reply must not be accepted after closure.' })
      .expect(409);

    expect(rejectedReply.body.code).toBe('TICKET_CLOSED');
  });
  it('returns authenticated trading snapshots and OHLCV candles', async () => {
    const candle = [1_792_368_000_000, '67000', '68000', '66500', '67842.29', '125.5'];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes('/ticker/24hr')) {
        return Response.json({
          closeTime: 1_792_368_000_000,
          highPrice: '68100',
          lastPrice: '67842.29',
          lowPrice: '66100',
          priceChangePercent: '2.47',
          quoteVolume: '1820000000',
        });
      }

      if (url.includes('/depth')) {
        return Response.json({
          asks: Array.from({ length: 20 }, (_, index) => [String(67843 + index), '0.1']),
          bids: Array.from({ length: 20 }, (_, index) => [String(67841 - index), '0.1']),
          lastUpdateId: 42,
        });
      }

      if (url.includes('/trades')) {
        return Response.json([
          { id: 91, isBuyerMaker: false, price: '67842.29', qty: '0.015', time: 1_792_368_000_000 },
        ]);
      }

      return Response.json(Array.from({ length: 50 }, () => candle));
    });
    const app = createApp();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@nexora.dev', password: 'Nexora123!' })
      .expect(200);
    const authorization = `Bearer ${String(login.body.accessToken)}`;
    const market = await request(app)
      .get('/api/markets/BTC-USDT/trading')
      .set('Authorization', authorization)
      .expect(200);
    const candles = await request(app)
      .get('/api/markets/BTC-USDT/candles?timeframe=15m&limit=50')
      .set('Authorization', authorization)
      .expect(200);
    const trades = await request(app)
      .get('/api/markets/BTC-USDT/trades?limit=30')
      .set('Authorization', authorization)
      .expect(200);
    expect(market.body).toMatchObject({ baseAsset: 'BTC', quoteAsset: 'USDT', symbol: 'BTC-USDT' });
    expect(market.body.depth.asks).toHaveLength(20);
    expect(candles.body).toHaveLength(50);
    expect(candles.body[0]).toEqual(
      expect.objectContaining({
        open: expect.any(Number),
        close: expect.any(Number),
        volume: expect.any(Number),
      })
    );
    expect(trades.body).toEqual([
      { amount: 0.015, id: 91, price: 67842.29, side: 'buy', time: 1_792_368_000_000 },
    ]);
    fetchMock.mockRestore();
  });
  it('settles a market order once and releases a cancelled limit-order reservation', async () => {
    const app = createApp();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@nexora.dev', password: 'Nexora123!' })
      .expect(200);
    const authorization = `Bearer ${String(login.body.accessToken)}`;
    const beforeUsdt = await walletRepository.getBalance('user-demo', 'USDT');
    const beforeBtc = await walletRepository.getBalance('user-demo', 'BTC');
    const marketOrder = await request(app)
      .post('/api/orders')
      .set('Authorization', authorization)
      .set('Idempotency-Key', 'trade-market-order-test-0001')
      .send({ amount: 0.001, price: 67842.29, side: 'buy', symbol: 'BTC-USDT', type: 'market' })
      .expect(201);
    const retry = await request(app)
      .post('/api/orders')
      .set('Authorization', authorization)
      .set('Idempotency-Key', 'trade-market-order-test-0001')
      .send({ amount: 0.001, price: 67842.29, side: 'buy', symbol: 'BTC-USDT', type: 'market' })
      .expect(201);
    expect(marketOrder.body.status).toBe('filled');
    expect(retry.body.id).toBe(marketOrder.body.id);
    expect(await walletRepository.getBalance('user-demo', 'BTC')).toBeCloseTo(beforeBtc + 0.001);
    expect(await walletRepository.getBalance('user-demo', 'USDT')).toBeLessThan(beforeUsdt);

    const availableBeforeLimit = await walletRepository.getAvailable('user-demo', 'USDT');
    const limitOrder = await request(app)
      .post('/api/orders')
      .set('Authorization', authorization)
      .set('Idempotency-Key', 'trade-limit-order-test-0002')
      .send({ amount: 0.001, price: 1000, side: 'buy', symbol: 'BTC-USDT', type: 'limit' })
      .expect(201);
    expect(limitOrder.body.status).toBe('open');
    expect(await walletRepository.getAvailable('user-demo', 'USDT')).toBeLessThan(availableBeforeLimit);
    await request(app)
      .patch(`/api/orders/${String(limitOrder.body.id)}/cancel`)
      .set('Authorization', authorization)
      .expect(200);
    expect(await walletRepository.getAvailable('user-demo', 'USDT')).toBeCloseTo(availableBeforeLimit);
  });
  it('saves and submits an authenticated verification case', async () => {
    const app = createApp();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@nexora.dev', password: 'Nexora123!' })
      .expect(200);
    const authorization = `Bearer ${String(login.body.accessToken)}`;
    const profile = await request(app)
      .put('/api/verification/profile')
      .set('Authorization', authorization)
      .send({ country: 'IR', fullName: 'Hamed Akbarzadeh', nationalId: 'A12345678' })
      .expect(200);
    expect(profile.body).toMatchObject({ country: 'IR', status: 'draft', nationalIdMasked: '*****5678' });
    expect(profile.body).not.toHaveProperty('nationalId');
    const document = await request(app)
      .post('/api/verification/document')
      .set('Authorization', authorization)
      .set('Content-Type', 'image/png')
      .set('X-Document-Name', encodeURIComponent('national-id.png'))
      .send(Buffer.from([137, 80, 78, 71]))
      .expect(201);
    expect(document.body).toMatchObject({
      status: 'ready',
      document: { name: 'national-id.png', mimeType: 'image/png', size: 4 },
    });
    const submitted = await request(app)
      .post('/api/verification/submit')
      .set('Authorization', authorization)
      .expect(200);
    expect(submitted.body.status).toBe('pending');
    await request(app)
      .put('/api/verification/profile')
      .set('Authorization', authorization)
      .send({ country: 'TR', fullName: 'Changed Name', nationalId: 'B12345678' })
      .expect(409);
  });
  it('registers masked bank cards, rejects duplicates and removes owned cards', async () => {
    const app = createApp();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@nexora.dev', password: 'Nexora123!' })
      .expect(200);
    const authorization = `Bearer ${String(login.body.accessToken)}`;
    const input = {
      iban: 'IR820540102680020817909002',
      number: '6037997512345670',
    };

    const created = await request(app)
      .post('/api/cards')
      .set('Authorization', authorization)
      .send(input)
      .expect(201);

    expect(created.body).toMatchObject({
      isDefault: true,
      maskedNumber: '6037 •••• •••• 5670',
    });
    expect(created.body).not.toHaveProperty('number');
    expect(created.body).not.toHaveProperty('iban');

    await request(app).post('/api/cards').set('Authorization', authorization).send(input).expect(409);

    const listed = await request(app).get('/api/cards').set('Authorization', authorization).expect(200);
    expect(listed.body).toHaveLength(1);

    await request(app)
      .delete(`/api/cards/${String(created.body.id)}`)
      .set('Authorization', authorization)
      .expect(204);

    const empty = await request(app).get('/api/cards').set('Authorization', authorization).expect(200);
    expect(empty.body).toHaveLength(0);
  });
  it('returns an owner-scoped referral summary with consistent totals', async () => {
    const app = createApp();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@nexora.dev', password: 'Nexora123!' })
      .expect(200);
    const response = await request(app)
      .get('/api/referrals')
      .set('Authorization', `Bearer ${String(login.body.accessToken)}`)
      .expect(200);

    expect(response.body).toMatchObject({
      code: 'NEXORA-USERDEMO',
      inviteCount: 3,
      qualifiedCount: 2,
      rewardCurrency: 'USDT',
      rewardRate: 20,
      rewardTotal: 118.85,
    });
    expect(response.body.referrals).toHaveLength(3);
    expect(response.body.referrals[0]).not.toHaveProperty('userId');
  });
  it('lists, revokes and invalidates account sessions when the password changes', async () => {
    const app = createApp();
    const primary = await request(app)
      .post('/api/auth/login')
      .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0')
      .send({ email: 'customer@nexora.dev', password: 'Nexora123!' })
      .expect(200);
    const secondary = await request(app)
      .post('/api/auth/login')
      .set('User-Agent', 'Mozilla/5.0 (Linux; Android 14) Firefox/120.0')
      .send({ email: 'customer@nexora.dev', password: 'Nexora123!' })
      .expect(200);
    const primaryAuthorization = `Bearer ${String(primary.body.accessToken)}`;
    const secondaryAuthorization = `Bearer ${String(secondary.body.accessToken)}`;

    const security = await request(app)
      .get('/api/account/security')
      .set('Authorization', primaryAuthorization)
      .expect(200);

    expect(security.body.sessions.length).toBeGreaterThanOrEqual(2);
    expect(security.body.sessions.filter((session: { current: boolean }) => session.current)).toHaveLength(1);
    expect(security.body.sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ browser: 'Chrome', current: true, device: 'Windows' }),
        expect.objectContaining({ browser: 'Firefox', current: false, device: 'Android' }),
      ])
    );

    const secondarySession = security.body.sessions.find(
      (session: { browser: string; device: string }) =>
        session.browser === 'Firefox' && session.device === 'Android'
    ) as { id: string };
    await request(app)
      .delete(`/api/account/sessions/${secondarySession.id}`)
      .set('Authorization', primaryAuthorization)
      .expect(204);
    await request(app).get('/api/auth/me').set('Authorization', secondaryAuthorization).expect(401);

    const anotherSession = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@nexora.dev', password: 'Nexora123!' })
      .expect(200);
    await request(app)
      .put('/api/account/password')
      .set('Authorization', primaryAuthorization)
      .send({ currentPassword: 'Nexora123!', newPassword: 'Nexora456!' })
      .expect(204);
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${String(anotherSession.body.accessToken)}`)
      .expect(401);
    await request(app)
      .put('/api/account/password')
      .set('Authorization', primaryAuthorization)
      .send({ currentPassword: 'Nexora456!', newPassword: 'Nexora123!' })
      .expect(204);
  });
  it('lists user-scoped notifications and persists read state', async () => {
    const app = createApp();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@nexora.dev', password: 'Nexora123!' })
      .expect(200);
    const authorization = `Bearer ${String(login.body.accessToken)}`;

    const initial = await request(app)
      .get('/api/account/notifications')
      .set('Authorization', authorization)
      .expect(200);
    expect(initial.body.unreadCount).toBeGreaterThan(0);
    expect(initial.body.items[0]).not.toHaveProperty('userId');

    const unread = initial.body.items.find((item: { readAt: string | null }) => !item.readAt) as { id: string };
    const updated = await request(app)
      .patch(`/api/account/notifications/${unread.id}/read`)
      .set('Authorization', authorization)
      .expect(200);
    expect(updated.body.unreadCount).toBe(initial.body.unreadCount - 1);

    await request(app)
      .patch('/api/account/notifications/notification-security-customer/read')
      .set('Authorization', authorization)
      .expect(404);

    const allRead = await request(app)
      .post('/api/account/notifications/read-all')
      .set('Authorization', authorization)
      .expect(200);
    expect(allRead.body.unreadCount).toBe(0);
    expect(allRead.body.items.every((item: { readAt: string | null }) => Boolean(item.readAt))).toBe(true);
  });
  it('enforces TOTP after setup and consumes recovery codes once', async () => {
    const app = createApp();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@nexora.dev', password: 'Nexora123!' })
      .expect(200);
    const authorization = `Bearer ${String(login.body.accessToken)}`;
    const setup = await request(app)
      .post('/api/account/mfa/setup')
      .set('Authorization', authorization)
      .send({ currentPassword: 'Nexora123!' })
      .expect(200);
    expect(setup.body).toMatchObject({
      otpauthUri: expect.stringMatching(/^otpauth:\/\/totp\/Nexora:/),
      secret: expect.stringMatching(/^[A-Z2-7]+$/),
      setupToken: expect.any(String),
    });
    const code = generateTotp(String(setup.body.secret));
    const confirmed = await request(app)
      .post('/api/account/mfa/confirm')
      .set('Authorization', authorization)
      .send({ code, setupToken: setup.body.setupToken })
      .expect(200);
    expect(confirmed.body.recoveryCodes).toHaveLength(10);

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@nexora.dev', password: 'Nexora123!' })
      .expect(401)
      .expect(({ body }) => expect(body.code).toBe('MFA_REQUIRED'));
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@nexora.dev', mfaCode: code, password: 'Nexora123!' })
      .expect(200);

    const recoveryCode = String(confirmed.body.recoveryCodes[0]);
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@nexora.dev', password: 'Nexora123!', recoveryCode })
      .expect(200);
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@nexora.dev', password: 'Nexora123!', recoveryCode })
      .expect(401)
      .expect(({ body }) => expect(body.code).toBe('INVALID_MFA_CODE'));

    await request(app)
      .delete('/api/account/mfa')
      .set('Authorization', authorization)
      .send({ code: generateTotp(String(setup.body.secret)), currentPassword: 'Nexora123!' })
      .expect(204);
  });
  it('persists account profile, avatar and preferences behind the authenticated owner', async () => {
    const app = createApp();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@nexora.dev', password: 'Nexora123!' })
      .expect(200);
    const authorization = `Bearer ${String(login.body.accessToken)}`;

    const profile = await request(app)
      .patch('/api/account/profile')
      .set('Authorization', authorization)
      .send({ name: 'Customer Updated', phone: '+98 912 345 6789' })
      .expect(200);
    expect(profile.body).toMatchObject({
      avatarUrl: null,
      email: 'customer@nexora.dev',
      name: 'Customer Updated',
      phone: '+98 912 345 6789',
    });

    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
    const avatar = await request(app)
      .put('/api/account/avatar')
      .set('Authorization', authorization)
      .set('Content-Type', 'image/png')
      .send(png)
      .expect(200);
    expect(avatar.body.avatarUrl).toBe(`data:image/png;base64,${png.toString('base64')}`);

    const preferences = {
      colorMode: 'light',
      language: 'en',
      priceAlerts: false,
      tradingNotifications: true,
    };
    await request(app)
      .put('/api/account/preferences')
      .set('Authorization', authorization)
      .send(preferences)
      .expect(200, preferences);
    await request(app)
      .get('/api/account/preferences')
      .set('Authorization', authorization)
      .expect(200, preferences);

    await request(app)
      .patch('/api/account/profile')
      .set('Authorization', authorization)
      .send({ name: 'Customer Demo', phone: '+98 912 000 0001' })
      .expect(200);
  });
});

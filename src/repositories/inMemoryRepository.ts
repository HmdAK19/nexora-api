import bcrypt from 'bcryptjs';

import type {
  AccountPreferencesRecord,
  AccountProfileRecord,
  AdminSettingsRecord,
  AuditEventRecord,
  BankCardRecord,
  ConversionOrderRecord,
  ConversionQuoteRecord,
  CreateUserRecord,
  NotificationRecord,
  OrderRecord,
  PurchaseOrderRecord,
  PurchaseQuoteRecord,
  ReferralRecord,
  SessionRecord,
  SupportMessageRecord,
  SupportTicketRecord,
  UserRecord,
  VerificationRecord,
  WalletTransactionRecord,
} from '../domain/index.js';

const users: UserRecord[] = [
  {
    id: 'user-demo',
    name: 'Hamed Akbarzadeh',
    email: 'demo@nexora.dev',
    passwordHash: bcrypt.hashSync('Nexora123!', 10),
    passwordChangedAt: new Date(Date.now() - 43 * 86400000).toISOString(),
    level: 'verified',
    role: 'admin',
    status: 'active',
  },
  {
    id: 'user-customer-demo',
    name: 'Customer Demo',
    email: 'customer@nexora.dev',
    passwordHash: bcrypt.hashSync('Nexora123!', 10),
    passwordChangedAt: new Date(Date.now() - 43 * 86400000).toISOString(),
    level: 'verified',
    role: 'customer',
    status: 'active',
  },
];
const accountProfiles = new Map<string, AccountProfileRecord>([
  ['user-demo', { phone: '+98 912 000 0000', userId: 'user-demo' }],
  ['user-customer-demo', { phone: '+98 912 000 0001', userId: 'user-customer-demo' }],
]);
const accountPreferences = new Map<string, AccountPreferencesRecord>([
  [
    'user-demo',
    {
      colorMode: 'dark',
      language: 'fa',
      priceAlerts: true,
      tradingNotifications: true,
      userId: 'user-demo',
    },
  ],
  [
    'user-customer-demo',
    {
      colorMode: 'dark',
      language: 'fa',
      priceAlerts: true,
      tradingNotifications: true,
      userId: 'user-customer-demo',
    },
  ],
]);
const notifications: NotificationRecord[] = [
  {
    actionPath: '/verification',
    createdAt: new Date(Date.now() - 20 * 60_000).toISOString(),
    id: 'notification-verification-demo',
    kind: 'verification_reminder',
    metadata: {},
    readAt: null,
    userId: 'user-demo',
  },
  {
    actionPath: '/orders',
    createdAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
    id: 'notification-order-demo',
    kind: 'order_placed',
    metadata: { symbol: 'BTC-USDT' },
    readAt: null,
    userId: 'user-demo',
  },
  {
    actionPath: '/settings',
    createdAt: new Date(Date.now() - 24 * 60 * 60_000).toISOString(),
    id: 'notification-security-demo',
    kind: 'security_recommendation',
    metadata: {},
    readAt: new Date(Date.now() - 12 * 60 * 60_000).toISOString(),
    userId: 'user-demo',
  },
  {
    actionPath: '/settings',
    createdAt: new Date(Date.now() - 45 * 60_000).toISOString(),
    id: 'notification-security-customer',
    kind: 'security_recommendation',
    metadata: {},
    readAt: null,
    userId: 'user-customer-demo',
  },
];
const orders: OrderRecord[] = [
  {
    id: 'ord-101',
    userId: 'user-demo',
    symbol: 'ETH-USDT',
    side: 'buy',
    type: 'limit',
    price: 3420,
    amount: 1.25,
    filled: 45,
    status: 'open',
    createdAt: new Date(Date.now() - 5400000).toISOString(),
    updatedAt: new Date(Date.now() - 5400000).toISOString(),
    averagePrice: 0,
    feeAmount: 0,
    quoteAmount: 4275,
    reservedAsset: 'USDT',
    reservedAmount: 4275,
  },
  {
    id: 'ord-102',
    userId: 'user-demo',
    symbol: 'BTC-USDT',
    side: 'sell',
    type: 'limit',
    price: 69500,
    amount: 0.14,
    filled: 100,
    status: 'filled',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    averagePrice: 69500,
    feeAmount: 9.73,
    quoteAmount: 9730,
  },
  {
    id: 'ord-103',
    userId: 'user-demo',
    symbol: 'SOL-USDT',
    side: 'buy',
    type: 'market',
    price: 169.22,
    amount: 12,
    filled: 100,
    status: 'filled',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
    averagePrice: 169.22,
    feeAmount: 2.03,
    quoteAmount: 2030.64,
  },
];
const walletBalances = new Map<string, Record<string, number>>([
  [
    'user-demo',
    {
      BTC: 0.8421,
      ETH: 5.438,
      SOL: 72.4,
      USDT: 24320.5,
      XRP: 4860,
      ADA: 12100,
      DOGE: 32000,
      USD: 100000,
    },
  ],
]);
const walletTransactions: WalletTransactionRecord[] = [
  {
    id: 'tx-101',
    userId: 'user-demo',
    asset: 'USDT',
    type: 'deposit',
    amount: 5000,
    network: 'TRC20',
    status: 'completed',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'tx-102',
    userId: 'user-demo',
    asset: 'BTC',
    type: 'withdraw',
    amount: 0.018,
    network: 'Bitcoin',
    address: 'bc1q-demo-destination-address',
    status: 'completed',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
];
const walletLocked = new Map<string, Record<string, number>>([['user-demo', { USDT: 4_275 }]]);
const orderIdempotency = new Map<string, OrderRecord>();
const purchaseQuotes = new Map<string, PurchaseQuoteRecord>();
const purchaseOrders = new Map<string, PurchaseOrderRecord>();
const purchaseIdempotency = new Map<string, PurchaseOrderRecord>();
const conversionQuotes = new Map<string, ConversionQuoteRecord>();
const conversionOrders = new Map<string, ConversionOrderRecord>();
const conversionIdempotency = new Map<string, ConversionOrderRecord>();
const supportTickets = new Map<string, SupportTicketRecord>();
const supportMessages: SupportMessageRecord[] = [];
const verifications = new Map<string, VerificationRecord>();
let adminSettings: AdminSettingsRecord = {
  minimumWithdrawal: 10,
  networkEnabled: true,
  paymentProvider: 'manual',
  tradingFeePercent: 0.08,
  updatedAt: new Date().toISOString(),
  withdrawalsEnabled: true,
};
const auditEvents: AuditEventRecord[] = [];
const bankCards: BankCardRecord[] = [];
const referrals: ReferralRecord[] = [
  {
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    id: 'ref-103',
    inviteeName: 'Nima R.',
    rewardAmount: 0,
    status: 'joined',
    userId: 'user-demo',
  },
  {
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    id: 'ref-102',
    inviteeName: 'Sara M.',
    rewardAmount: 42.6,
    status: 'qualified',
    userId: 'user-demo',
  },
  {
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
    id: 'ref-101',
    inviteeName: 'Arman K.',
    rewardAmount: 76.25,
    status: 'rewarded',
    userId: 'user-demo',
  },
];
const sessions = new Map<string, SessionRecord>();
const pendingMfa = new Map<string, { expiresAt: number; secret: string; userId: string }>();
const mfaCredentials = new Map<string, { hashes: Set<string>; secret: string }>();
export const userRepository = {
  create: (input: CreateUserRecord) => {
    if (users.some((user) => user.email.toLowerCase() === input.user.email.toLowerCase())) return undefined;
    users.push({ ...input.user });
    accountProfiles.set(input.user.id, { phone: input.phone, userId: input.user.id });
    accountPreferences.set(input.user.id, {
      colorMode: 'dark',
      language: input.language,
      priceAlerts: true,
      tradingNotifications: true,
      userId: input.user.id,
    });
    walletBalances.set(input.user.id, { BTC: 0, ETH: 0, SOL: 0, USD: 0, USDT: 0 });
    walletLocked.set(input.user.id, {});
    verifications.set(input.user.id, {
      status: 'not_started',
      updatedAt: new Date().toISOString(),
      userId: input.user.id,
    });
    return { ...input.user };
  },
  findByEmail: (email: string) => users.find((user) => user.email.toLowerCase() === email.toLowerCase()),
  findById: (id: string) => users.find((user) => user.id === id),
  list: () => [...users],
  updatePassword: (id: string, passwordHash: string) => {
    const user = users.find((candidate) => candidate.id === id);
    if (!user) return undefined;
    user.passwordHash = passwordHash;
    user.passwordChangedAt = new Date().toISOString();
    return user;
  },
  updateName: (id: string, name: string) => {
    const user = users.find((candidate) => candidate.id === id);
    if (!user) return undefined;
    user.name = name;
    return user;
  },
};
export const accountProfileRepository = {
  get: (userId: string) => accountProfiles.get(userId),
  update: (userId: string, patch: Partial<Omit<AccountProfileRecord, 'userId'>>) => {
    const current = accountProfiles.get(userId) ?? { phone: '', userId };
    const updated = { ...current, ...patch, userId };
    accountProfiles.set(userId, updated);
    return updated;
  },
};
export const accountPreferencesRepository = {
  get: (userId: string) => accountPreferences.get(userId),
  update: (record: AccountPreferencesRecord) => {
    accountPreferences.set(record.userId, record);
    return { ...record };
  },
};

export const notificationRepository = {
  listByUser: (userId: string) =>
    notifications
      .filter((notification) => notification.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((notification) => ({ ...notification, metadata: { ...notification.metadata } })),
  markAllRead: (userId: string, readAt: string) => {
    for (const notification of notifications) {
      if (notification.userId === userId && !notification.readAt) notification.readAt = readAt;
    }
  },
  markRead: (userId: string, id: string, readAt: string) => {
    const notification = notifications.find((item) => item.id === id && item.userId === userId);
    if (!notification) return undefined;
    notification.readAt ??= readAt;
    return { ...notification, metadata: { ...notification.metadata } };
  },
};
export const orderRepository = {
  list: () => [...orders],
  listByUser: (userId: string) =>
    orders.filter((order) => order.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  create: (order: OrderRecord) => {
    orders.unshift(order);
    if (order.idempotencyKey) orderIdempotency.set(`${order.userId}:${order.idempotencyKey}`, order);
    return order;
  },
  findByIdempotencyKey: (userId: string, key: string) => orderIdempotency.get(`${userId}:${key}`),
  findById: (id: string) => orders.find((order) => order.id === id),
  update: (id: string, patch: Partial<OrderRecord>) => {
    const order = orders.find((item) => item.id === id);
    if (!order) return undefined;
    Object.assign(order, patch);
    return order;
  },
  createWithSettlement: (order: OrderRecord) => {
    const previous = order.idempotencyKey
      ? orderIdempotency.get(`${order.userId}:${order.idempotencyKey}`)
      : undefined;
    if (previous) return { kind: 'existing', order: previous } as const;
    const [base, quote] = order.symbol.split('-') as [string, string];
    const balances = walletBalances.get(order.userId) ?? {};
    const locked = walletLocked.get(order.userId) ?? {};
    if (order.status === 'filled') {
      if (order.side === 'buy') {
        const total = order.quoteAmount + order.feeAmount;
        if ((balances[quote] ?? 0) - (locked[quote] ?? 0) < total)
          return { kind: 'insufficient_balance' } as const;
        balances[quote] = (balances[quote] ?? 0) - total;
        balances[base] = (balances[base] ?? 0) + order.amount;
      } else {
        if ((balances[base] ?? 0) - (locked[base] ?? 0) < order.amount)
          return { kind: 'insufficient_balance' } as const;
        balances[base] = (balances[base] ?? 0) - order.amount;
        balances[quote] = (balances[quote] ?? 0) + order.quoteAmount - order.feeAmount;
      }
      walletBalances.set(order.userId, balances);
    } else if (order.reservedAsset && order.reservedAmount) {
      if ((balances[order.reservedAsset] ?? 0) - (locked[order.reservedAsset] ?? 0) < order.reservedAmount)
        return { kind: 'insufficient_balance' } as const;
      locked[order.reservedAsset] = (locked[order.reservedAsset] ?? 0) + order.reservedAmount;
      walletLocked.set(order.userId, locked);
    }
    orders.unshift(order);
    if (order.idempotencyKey) orderIdempotency.set(`${order.userId}:${order.idempotencyKey}`, order);
    return { kind: 'success', order } as const;
  },
  cancelWithRelease: (userId: string, id: string, updatedAt: string) => {
    const order = orders.find((item) => item.id === id && item.userId === userId);
    if (!order) return { kind: 'not_found' } as const;
    if (order.status !== 'open') return { kind: 'not_open' } as const;
    if (order.reservedAsset && order.reservedAmount) {
      const locked = walletLocked.get(userId) ?? {};
      locked[order.reservedAsset] = Math.max(0, (locked[order.reservedAsset] ?? 0) - order.reservedAmount);
      walletLocked.set(userId, locked);
    }
    Object.assign(order, { reservedAmount: 0, status: 'cancelled' as const, updatedAt });
    return { kind: 'success', order } as const;
  },
};
export const walletRepository = {
  getBalance: (userId: string, asset: string) => walletBalances.get(userId)?.[asset] ?? 0,
  getAvailable: (userId: string, asset: string) =>
    (walletBalances.get(userId)?.[asset] ?? 0) - (walletLocked.get(userId)?.[asset] ?? 0),
  getLocked: (userId: string, asset: string) => walletLocked.get(userId)?.[asset] ?? 0,
  listBalances: (userId: string) => ({
    ...(walletBalances.get(userId) ?? {}),
  }),
  adjustBalance: (userId: string, asset: string, delta: number) => {
    const balances = walletBalances.get(userId) ?? {};
    const nextBalance = (balances[asset] ?? 0) + delta;
    balances[asset] = nextBalance;
    walletBalances.set(userId, balances);
    return nextBalance;
  },
  reserve: (userId: string, asset: string, amount: number) => {
    if (walletRepository.getAvailable(userId, asset) < amount) return false;
    const locked = walletLocked.get(userId) ?? {};
    locked[asset] = (locked[asset] ?? 0) + amount;
    walletLocked.set(userId, locked);
    return true;
  },
  release: (userId: string, asset: string, amount: number) => {
    const locked = walletLocked.get(userId) ?? {};
    locked[asset] = Math.max(0, (locked[asset] ?? 0) - amount);
    walletLocked.set(userId, locked);
  },
  settleTrade: (
    userId: string,
    base: string,
    quote: string,
    side: 'buy' | 'sell',
    amount: number,
    quoteAmount: number,
    feeAmount: number
  ) => {
    const balances = walletBalances.get(userId) ?? {};
    if (side === 'buy') {
      const total = quoteAmount + feeAmount;
      if (walletRepository.getAvailable(userId, quote) < total) return false;
      balances[quote] = (balances[quote] ?? 0) - total;
      balances[base] = (balances[base] ?? 0) + amount;
    } else {
      if (walletRepository.getAvailable(userId, base) < amount) return false;
      balances[base] = (balances[base] ?? 0) - amount;
      balances[quote] = (balances[quote] ?? 0) + quoteAmount - feeAmount;
    }
    walletBalances.set(userId, balances);
    return true;
  },
  settlePurchase: (userId: string, totalAmount: number, asset: string, assetAmount: number) => {
    const balances = walletBalances.get(userId) ?? {};
    const fiatBalance = balances.USD ?? 0;

    if (fiatBalance < totalAmount) return false;

    balances.USD = fiatBalance - totalAmount;
    balances[asset] = (balances[asset] ?? 0) + assetAmount;
    walletBalances.set(userId, balances);
    return true;
  },
  settleConversion: (
    userId: string,
    fromAsset: string,
    sourceAmount: number,
    toAsset: string,
    destinationAmount: number
  ) => {
    const balances = walletBalances.get(userId) ?? {};
    const sourceBalance = balances[fromAsset] ?? 0;

    if (sourceBalance < sourceAmount) return false;

    balances[fromAsset] = sourceBalance - sourceAmount;
    balances[toAsset] = (balances[toAsset] ?? 0) + destinationAmount;
    walletBalances.set(userId, balances);
    return true;
  },
  listTransactions: (userId: string) =>
    walletTransactions
      .filter((transaction) => transaction.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  createTransaction: (transaction: WalletTransactionRecord) => {
    walletTransactions.unshift(transaction);
    return transaction;
  },
  executeTransfer: (transaction: WalletTransactionRecord) => {
    const balances = walletBalances.get(transaction.userId) ?? {};
    const locked = walletLocked.get(transaction.userId)?.[transaction.asset] ?? 0;
    if (transaction.type === 'withdraw' && (balances[transaction.asset] ?? 0) - locked < transaction.amount)
      return { kind: 'insufficient_balance' } as const;
    balances[transaction.asset] =
      (balances[transaction.asset] ?? 0) +
      (transaction.type === 'deposit' ? transaction.amount : -transaction.amount);
    walletBalances.set(transaction.userId, balances);
    walletTransactions.unshift(transaction);
    return { kind: 'success', transaction } as const;
  },
};

export const purchaseRepository = {
  createQuote: (quote: PurchaseQuoteRecord) => {
    purchaseQuotes.set(quote.id, quote);
    return quote;
  },
  findQuoteById: (id: string) => purchaseQuotes.get(id),
  consumeQuote: (id: string, consumedAt: string) => {
    const quote = purchaseQuotes.get(id);

    if (!quote || quote.consumedAt) return undefined;

    quote.consumedAt = consumedAt;
    return quote;
  },
  createOrder: (order: PurchaseOrderRecord) => {
    purchaseOrders.set(order.id, order);
    purchaseIdempotency.set(`${order.userId}:${order.idempotencyKey}`, order);
    return order;
  },
  findOrderById: (id: string) => purchaseOrders.get(id),
  findOrderByIdempotencyKey: (userId: string, key: string) => purchaseIdempotency.get(`${userId}:${key}`),
  executeQuote: (order: PurchaseOrderRecord, now: string) => {
    const previous = purchaseIdempotency.get(`${order.userId}:${order.idempotencyKey}`);
    if (previous)
      return previous.quoteId === order.quoteId
        ? ({ kind: 'success', order: previous } as const)
        : ({ kind: 'idempotency_conflict' } as const);
    const quote = purchaseQuotes.get(order.quoteId);
    if (!quote || quote.userId !== order.userId) return { kind: 'not_found' } as const;
    if (Date.parse(quote.expiresAt) <= Date.parse(now)) return { kind: 'expired' } as const;
    if (quote.consumedAt) return { kind: 'already_used' } as const;
    if (walletRepository.getAvailable(order.userId, 'USD') < quote.totalAmount)
      return { kind: 'insufficient_balance' } as const;
    const balances = walletBalances.get(order.userId) ?? {};
    balances.USD = (balances.USD ?? 0) - quote.totalAmount;
    balances[quote.asset] = (balances[quote.asset] ?? 0) + quote.assetAmount;
    walletBalances.set(order.userId, balances);
    quote.consumedAt = now;
    const completed = { ...order, asset: quote.asset, assetAmount: quote.assetAmount, fiatAmount: quote.fiatAmount, fiatCurrency: quote.fiatCurrency };
    purchaseOrders.set(completed.id, completed);
    purchaseIdempotency.set(`${completed.userId}:${completed.idempotencyKey}`, completed);
    return { kind: 'success', order: completed } as const;
  },
};

export const conversionRepository = {
  createQuote: (quote: ConversionQuoteRecord) => {
    conversionQuotes.set(quote.id, quote);
    return quote;
  },
  findQuoteById: (id: string) => conversionQuotes.get(id),
  consumeQuote: (id: string, consumedAt: string) => {
    const quote = conversionQuotes.get(id);

    if (!quote || quote.consumedAt) return undefined;

    quote.consumedAt = consumedAt;
    return quote;
  },
  createOrder: (order: ConversionOrderRecord) => {
    conversionOrders.set(order.id, order);
    conversionIdempotency.set(`${order.userId}:${order.idempotencyKey}`, order);
    return order;
  },
  findOrderById: (id: string) => conversionOrders.get(id),
  findOrderByIdempotencyKey: (userId: string, key: string) => conversionIdempotency.get(`${userId}:${key}`),
  executeQuote: (order: ConversionOrderRecord, now: string) => {
    const previous = conversionIdempotency.get(`${order.userId}:${order.idempotencyKey}`);
    if (previous)
      return previous.quoteId === order.quoteId
        ? ({ kind: 'success', order: previous } as const)
        : ({ kind: 'idempotency_conflict' } as const);
    const quote = conversionQuotes.get(order.quoteId);
    if (!quote || quote.userId !== order.userId) return { kind: 'not_found' } as const;
    if (Date.parse(quote.expiresAt) <= Date.parse(now)) return { kind: 'expired' } as const;
    if (quote.consumedAt) return { kind: 'already_used' } as const;
    if (walletRepository.getAvailable(order.userId, quote.fromAsset) < quote.sourceAmount)
      return { kind: 'insufficient_balance' } as const;
    const balances = walletBalances.get(order.userId) ?? {};
    balances[quote.fromAsset] = (balances[quote.fromAsset] ?? 0) - quote.sourceAmount;
    balances[quote.toAsset] = (balances[quote.toAsset] ?? 0) + quote.destinationAmount;
    walletBalances.set(order.userId, balances);
    quote.consumedAt = now;
    const completed = { ...order, destinationAmount: quote.destinationAmount, fromAsset: quote.fromAsset, sourceAmount: quote.sourceAmount, toAsset: quote.toAsset };
    conversionOrders.set(completed.id, completed);
    conversionIdempotency.set(`${completed.userId}:${completed.idempotencyKey}`, completed);
    return { kind: 'success', order: completed } as const;
  },
};

export const supportRepository = {
  createTicket: (ticket: SupportTicketRecord, message: SupportMessageRecord) => {
    supportTickets.set(ticket.id, ticket);
    supportMessages.push(message);
    return ticket;
  },
  findTicketById: (id: string) => supportTickets.get(id),
  listMessages: (ticketId: string) =>
    supportMessages
      .filter((message) => message.ticketId === ticketId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  listTicketsByUser: (userId: string) =>
    [...supportTickets.values()]
      .filter((ticket) => ticket.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  listTickets: () => [...supportTickets.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  addMessage: (message: SupportMessageRecord) => {
    supportMessages.push(message);
    return message;
  },
  updateTicket: (id: string, patch: Partial<SupportTicketRecord>) => {
    const ticket = supportTickets.get(id);

    if (!ticket) return undefined;

    Object.assign(ticket, patch);
    return ticket;
  },
};

export const verificationRepository = {
  findByUser: (userId: string) => verifications.get(userId),
  save: (record: VerificationRecord) => {
    verifications.set(record.userId, record);
    return record;
  },
  list: () => [...verifications.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
};

export const adminSettingsRepository = {
  get: () => ({ ...adminSettings }),
  update: (settings: AdminSettingsRecord) => {
    adminSettings = { ...settings };
    return { ...adminSettings };
  },
};

export const auditRepository = {
  add: (event: AuditEventRecord) => {
    auditEvents.unshift(event);
    return event;
  },
  list: () => auditEvents.map((event) => ({ ...event })),
};

export const bankCardRepository = {
  create: (card: BankCardRecord) => {
    bankCards.push(card);
    return card;
  },
  delete: (userId: string, id: string) => {
    const index = bankCards.findIndex((card) => card.userId === userId && card.id === id);
    if (index < 0) return undefined;
    return bankCards.splice(index, 1)[0];
  },
  findByFingerprint: (userId: string, fingerprint: string) =>
    bankCards.find((card) => card.userId === userId && card.fingerprint === fingerprint),
  findById: (userId: string, id: string) =>
    bankCards.find((card) => card.userId === userId && card.id === id),
  listByUser: (userId: string) =>
    bankCards
      .filter((card) => card.userId === userId)
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || b.createdAt.localeCompare(a.createdAt)),
  setDefault: (userId: string, id: string) => {
    let selected: BankCardRecord | undefined;
    for (const card of bankCards) {
      if (card.userId !== userId) continue;
      card.isDefault = card.id === id;
      if (card.id === id) selected = card;
    }
    return selected;
  },
};

export const referralRepository = {
  listByUser: (userId: string) =>
    referrals
      .filter((referral) => referral.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
};

export const sessionRepository = {
  create: (record: SessionRecord) => {
    sessions.set(record.id, record);
    return record;
  },
  delete: (id: string) => sessions.delete(id),
  deleteOthers: (userId: string, currentId: string) => {
    for (const [id, session] of sessions) {
      if (session.userId === userId && id !== currentId) sessions.delete(id);
    }
  },
  findById: (id: string) => sessions.get(id),
  listByUser: (userId: string) =>
    [...sessions.values()]
      .filter((session) => session.userId === userId && session.expiresAt > Date.now())
      .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt)),
  touch: (id: string, lastActiveAt: string) => {
    const session = sessions.get(id);
    if (session) session.lastActiveAt = lastActiveAt;
  },
};

export const mfaRepository = {
  consumeRecoveryCode: (userId: string, hash: string) => {
    const credential = mfaCredentials.get(userId);
    if (!credential?.hashes.has(hash)) return false;
    credential.hashes.delete(hash);
    return true;
  },
  createPending: (id: string, userId: string, secret: string, expiresAt: number) => {
    pendingMfa.set(id, { expiresAt, secret, userId });
  },
  deletePending: (id: string) => pendingMfa.delete(id),
  disable: (userId: string) => mfaCredentials.delete(userId),
  enable: (userId: string, secret: string, hashes: string[]) => {
    mfaCredentials.set(userId, { hashes: new Set(hashes), secret });
  },
  getPending: (id: string) => pendingMfa.get(id),
  getSecret: (userId: string) => mfaCredentials.get(userId)?.secret,
  isEnabled: (userId: string) => mfaCredentials.has(userId),
};

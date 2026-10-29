import bcrypt from 'bcryptjs';

import type {
  AdminSettingsRecord,
  AuditEventRecord,
  BankCardRecord,
  ConversionOrderRecord,
  ConversionQuoteRecord,
  OrderRecord,
  PurchaseOrderRecord,
  PurchaseQuoteRecord,
  ReferralRecord,
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
    level: 'verified',
    role: 'admin',
    status: 'active',
  },
  {
    id: 'user-customer-demo',
    name: 'Customer Demo',
    email: 'customer@nexora.dev',
    passwordHash: bcrypt.hashSync('Nexora123!', 10),
    level: 'verified',
    role: 'customer',
    status: 'active',
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
export const userRepository = {
  findByEmail: (email: string) => users.find((user) => user.email.toLowerCase() === email.toLowerCase()),
  findById: (id: string) => users.find((user) => user.id === id),
  list: () => [...users],
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

import { Prisma } from '@prisma/client';

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
import { prisma } from '../persistence/prismaClient.js';

const number = (value: Prisma.Decimal | number) => Number(value);
const iso = (value: Date) => value.toISOString();
const optionalIso = (value: Date | null) => value?.toISOString();
const serializable = async <T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt === 3)
        throw error;
    }
  }
  throw new Error('Serializable transaction retry limit exceeded');
};
const userRecord = (value: Awaited<ReturnType<typeof prisma.user.findUnique>>): UserRecord | undefined =>
  value
    ? {
        email: value.email,
        id: value.id,
        level: value.level,
        name: value.name,
        passwordChangedAt: iso(value.passwordChangedAt),
        passwordHash: value.passwordHash,
        role: value.role,
        status: value.status,
      }
    : undefined;
const orderRecord = (value: NonNullable<Awaited<ReturnType<typeof prisma.order.findUnique>>>): OrderRecord => ({
  amount: number(value.amount),
  averagePrice: number(value.averagePrice),
  createdAt: iso(value.createdAt),
  feeAmount: number(value.feeAmount),
  filled: number(value.filled),
  id: value.id,
  idempotencyKey: value.idempotencyKey ?? undefined,
  price: number(value.price),
  quoteAmount: number(value.quoteAmount),
  reservedAmount: value.reservedAmount === null ? undefined : number(value.reservedAmount),
  reservedAsset: value.reservedAsset ?? undefined,
  side: value.side,
  status: value.status,
  symbol: value.symbol,
  type: value.type,
  updatedAt: iso(value.updatedAt),
  userId: value.userId,
});
const purchaseQuoteRecord = (
  value: NonNullable<Awaited<ReturnType<typeof prisma.purchaseQuote.findUnique>>>
): PurchaseQuoteRecord => ({
  asset: value.asset,
  assetAmount: number(value.assetAmount),
  consumedAt: optionalIso(value.consumedAt),
  expiresAt: iso(value.expiresAt),
  feeAmount: number(value.feeAmount),
  fiatAmount: number(value.fiatAmount),
  fiatCurrency: 'USD',
  id: value.id,
  totalAmount: number(value.totalAmount),
  unitPrice: number(value.unitPrice),
  userId: value.userId,
});
const purchaseOrderRecord = (
  value: NonNullable<Awaited<ReturnType<typeof prisma.purchaseOrder.findUnique>>>
): PurchaseOrderRecord => ({
  asset: value.asset,
  assetAmount: number(value.assetAmount),
  createdAt: iso(value.createdAt),
  fiatAmount: number(value.fiatAmount),
  fiatCurrency: 'USD',
  id: value.id,
  idempotencyKey: value.idempotencyKey,
  quoteId: value.quoteId,
  status: value.status,
  userId: value.userId,
});
const conversionQuoteRecord = (
  value: NonNullable<Awaited<ReturnType<typeof prisma.conversionQuote.findUnique>>>
): ConversionQuoteRecord => ({
  consumedAt: optionalIso(value.consumedAt),
  destinationAmount: number(value.destinationAmount),
  expiresAt: iso(value.expiresAt),
  feeAmount: number(value.feeAmount),
  fromAsset: value.fromAsset,
  id: value.id,
  rate: number(value.rate),
  sourceAmount: number(value.sourceAmount),
  toAsset: value.toAsset,
  userId: value.userId,
});
const conversionOrderRecord = (
  value: NonNullable<Awaited<ReturnType<typeof prisma.conversionOrder.findUnique>>>
): ConversionOrderRecord => ({
  createdAt: iso(value.createdAt),
  destinationAmount: number(value.destinationAmount),
  fromAsset: value.fromAsset,
  id: value.id,
  idempotencyKey: value.idempotencyKey,
  quoteId: value.quoteId,
  sourceAmount: number(value.sourceAmount),
  status: value.status,
  toAsset: value.toAsset,
  userId: value.userId,
});
const supportTicketRecord = (
  value: NonNullable<Awaited<ReturnType<typeof prisma.supportTicket.findUnique>>>
): SupportTicketRecord => ({
  category: value.category,
  createdAt: iso(value.createdAt),
  id: value.id,
  status: value.status,
  subject: value.subject,
  updatedAt: iso(value.updatedAt),
  userId: value.userId,
});
const supportMessageRecord = (
  value: NonNullable<Awaited<ReturnType<typeof prisma.supportMessage.findUnique>>>
): SupportMessageRecord => ({
  author: value.author,
  body: value.body,
  createdAt: iso(value.createdAt),
  id: value.id,
  ticketId: value.ticketId,
});
const verificationRecord = (
  value: NonNullable<Awaited<ReturnType<typeof prisma.verification.findUnique>>>
): VerificationRecord => ({
  country: value.country ?? undefined,
  document:
    value.documentId && value.documentMimeType && value.documentName && value.documentSize && value.documentUploadedAt
      ? {
          id: value.documentId,
          mimeType: value.documentMimeType,
          name: value.documentName,
          size: value.documentSize,
          uploadedAt: iso(value.documentUploadedAt),
        }
      : undefined,
  documentData: value.documentData ? Buffer.from(value.documentData) : undefined,
  fullName: value.fullName ?? undefined,
  nationalId: value.nationalId ?? undefined,
  status: value.status,
  submittedAt: optionalIso(value.submittedAt),
  updatedAt: iso(value.updatedAt),
  userId: value.userId,
});

export const prismaRepositories = {
  userRepository: {
    create: async (input: CreateUserRecord) => {
      try {
        const user = await prisma.user.create({
          data: {
            ...input.user,
            passwordChangedAt: new Date(input.user.passwordChangedAt),
            termsAcceptedAt: new Date(input.termsAcceptedAt),
            balances: {
              create: ['BTC', 'ETH', 'SOL', 'USD', 'USDT'].map((asset) => ({ asset, balance: 0, locked: 0 })),
            },
            preferences: {
              create: {
                colorMode: 'dark',
                language: input.language,
                priceAlerts: true,
                tradingNotifications: true,
              },
            },
            profile: { create: { phone: input.phone } },
            verification: { create: { status: 'not_started', updatedAt: new Date() } },
          },
        });
        return userRecord(user);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return undefined;
        throw error;
      }
    },
    findByEmail: async (email: string) => userRecord(await prisma.user.findUnique({ where: { email } })),
    findById: async (id: string) => userRecord(await prisma.user.findUnique({ where: { id } })),
    list: async () => (await prisma.user.findMany()).map((user) => userRecord(user)!),
    updatePassword: async (id: string, passwordHash: string) =>
      userRecord(
        await prisma.user
          .update({ data: { passwordChangedAt: new Date(), passwordHash }, where: { id } })
          .catch(() => null)
      ),
    updateName: async (id: string, name: string) =>
      userRecord(await prisma.user.update({ data: { name }, where: { id } }).catch(() => null)),
  },
  accountProfileRepository: {
    get: async (userId: string): Promise<AccountProfileRecord | undefined> => {
      const value = await prisma.accountProfile.findUnique({ where: { userId } });
      return value
        ? {
            avatar:
              value.avatarData && value.avatarMime
                ? {
                    data: Buffer.from(value.avatarData),
                    mimeType: value.avatarMime as NonNullable<AccountProfileRecord['avatar']>['mimeType'],
                  }
                : undefined,
            phone: value.phone,
            userId,
          }
        : undefined;
    },
    update: async (userId: string, patch: Partial<Omit<AccountProfileRecord, 'userId'>>) => {
      const value = await prisma.accountProfile.upsert({
        create: {
          avatarData: patch.avatar ? Uint8Array.from(patch.avatar.data) : undefined,
          avatarMime: patch.avatar?.mimeType,
          phone: patch.phone ?? '',
          userId,
        },
        update: {
          ...(patch.avatar
            ? { avatarData: Uint8Array.from(patch.avatar.data), avatarMime: patch.avatar.mimeType }
            : {}),
          ...(patch.phone === undefined ? {} : { phone: patch.phone }),
        },
        where: { userId },
      });
      return {
        avatar:
          value.avatarData && value.avatarMime
            ? {
                data: Buffer.from(value.avatarData),
                mimeType: value.avatarMime as NonNullable<AccountProfileRecord['avatar']>['mimeType'],
              }
            : undefined,
        phone: value.phone,
        userId,
      };
    },
  },
  accountPreferencesRepository: {
    get: async (userId: string): Promise<AccountPreferencesRecord | undefined> =>
      (await prisma.accountPreferences.findUnique({ where: { userId } })) ?? undefined,
    update: async (record: AccountPreferencesRecord): Promise<AccountPreferencesRecord> =>
      prisma.accountPreferences.upsert({
        create: record,
        update: record,
        where: { userId: record.userId },
      }),
  },
  notificationRepository: {
    listByUser: async (userId: string): Promise<NotificationRecord[]> =>
      (await prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, where: { userId } })).map(
        (value) => ({
          actionPath: value.actionPath,
          createdAt: iso(value.createdAt),
          id: value.id,
          kind: value.kind,
          metadata: value.metadata as Record<string, string>,
          readAt: value.readAt ? iso(value.readAt) : null,
          userId: value.userId,
        })
      ),
    markAllRead: async (userId: string, readAt: string) => {
      await prisma.notification.updateMany({
        data: { readAt: new Date(readAt) },
        where: { readAt: null, userId },
      });
    },
    markRead: async (userId: string, id: string, readAt: string) => {
      const result = await prisma.notification.updateMany({
        data: { readAt: new Date(readAt) },
        where: { id, readAt: null, userId },
      });
      const value = await prisma.notification.findFirst({ where: { id, userId } });
      if (!value || (!result.count && !value.readAt)) return undefined;
      return {
        actionPath: value.actionPath,
        createdAt: iso(value.createdAt),
        id: value.id,
        kind: value.kind,
        metadata: value.metadata as Record<string, string>,
        readAt: value.readAt ? iso(value.readAt) : null,
        userId: value.userId,
      } satisfies NotificationRecord;
    },
  },
  orderRepository: {
    list: async () => (await prisma.order.findMany()).map(orderRecord),
    listByUser: async (userId: string) =>
      (await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, where: { userId } })).map(orderRecord),
    create: async (record: OrderRecord) =>
      orderRecord(
        await prisma.order.create({
          data: { ...record, createdAt: new Date(record.createdAt), updatedAt: new Date(record.updatedAt) },
        })
      ),
    findByIdempotencyKey: async (userId: string, idempotencyKey: string) => {
      const value = await prisma.order.findUnique({ where: { userId_idempotencyKey: { idempotencyKey, userId } } });
      return value ? orderRecord(value) : undefined;
    },
    findById: async (id: string) => {
      const value = await prisma.order.findUnique({ where: { id } });
      return value ? orderRecord(value) : undefined;
    },
    update: async (id: string, patch: Partial<OrderRecord>) => {
      const value = await prisma.order.update({
        data: { ...patch, createdAt: patch.createdAt ? new Date(patch.createdAt) : undefined, updatedAt: patch.updatedAt ? new Date(patch.updatedAt) : undefined },
        where: { id },
      }).catch(() => null);
      return value ? orderRecord(value) : undefined;
    },
    createWithSettlement: async (order: OrderRecord) =>
      serializable(async (tx) => {
        if (order.idempotencyKey) {
          const previous = await tx.order.findUnique({ where: { userId_idempotencyKey: { idempotencyKey: order.idempotencyKey, userId: order.userId } } });
          if (previous) return { kind: 'existing', order: orderRecord(previous) } as const;
        }
        const [base, quote] = order.symbol.split('-') as [string, string];
        if (order.status === 'filled') {
          const debitAsset = order.side === 'buy' ? quote : base;
          const debitAmount = order.side === 'buy' ? order.quoteAmount + order.feeAmount : order.amount;
          const debit = await tx.walletBalance.findUnique({ where: { userId_asset: { asset: debitAsset, userId: order.userId } } });
          if (!debit || debit.balance.minus(debit.locked).lessThan(debitAmount)) return { kind: 'insufficient_balance' } as const;
          await tx.walletBalance.update({ data: { balance: { decrement: debitAmount } }, where: { userId_asset: { asset: debitAsset, userId: order.userId } } });
          const creditAsset = order.side === 'buy' ? base : quote;
          const creditAmount = order.side === 'buy' ? order.amount : order.quoteAmount - order.feeAmount;
          await tx.walletBalance.upsert({ create: { asset: creditAsset, balance: creditAmount, locked: 0, userId: order.userId }, update: { balance: { increment: creditAmount } }, where: { userId_asset: { asset: creditAsset, userId: order.userId } } });
        } else if (order.reservedAsset && order.reservedAmount) {
          const balance = await tx.walletBalance.findUnique({ where: { userId_asset: { asset: order.reservedAsset, userId: order.userId } } });
          if (!balance || balance.balance.minus(balance.locked).lessThan(order.reservedAmount)) return { kind: 'insufficient_balance' } as const;
          await tx.walletBalance.update({ data: { locked: { increment: order.reservedAmount } }, where: { userId_asset: { asset: order.reservedAsset, userId: order.userId } } });
        }
        const created = await tx.order.create({ data: { ...order, createdAt: new Date(order.createdAt), updatedAt: new Date(order.updatedAt) } });
        return { kind: 'success', order: orderRecord(created) } as const;
      }),
    cancelWithRelease: async (userId: string, id: string, updatedAt: string) =>
      serializable(async (tx) => {
        const order = await tx.order.findFirst({ where: { id, userId } });
        if (!order) return { kind: 'not_found' } as const;
        if (order.status !== 'open') return { kind: 'not_open' } as const;
        if (order.reservedAsset && order.reservedAmount) {
          const balance = await tx.walletBalance.findUnique({ where: { userId_asset: { asset: order.reservedAsset, userId } } });
          if (balance) {
            const nextLocked = Prisma.Decimal.max(balance.locked.minus(order.reservedAmount), 0);
            await tx.walletBalance.update({ data: { locked: nextLocked }, where: { userId_asset: { asset: order.reservedAsset, userId } } });
          }
        }
        const updated = await tx.order.update({ data: { reservedAmount: 0, status: 'cancelled', updatedAt: new Date(updatedAt) }, where: { id } });
        return { kind: 'success', order: orderRecord(updated) } as const;
      }),
  },
  walletRepository: {
    getBalance: async (userId: string, asset: string) =>
      number((await prisma.walletBalance.findUnique({ where: { userId_asset: { asset, userId } } }))?.balance ?? 0),
    getAvailable: async (userId: string, asset: string) => {
      const value = await prisma.walletBalance.findUnique({ where: { userId_asset: { asset, userId } } });
      return value ? number(value.balance.minus(value.locked)) : 0;
    },
    getLocked: async (userId: string, asset: string) =>
      number((await prisma.walletBalance.findUnique({ where: { userId_asset: { asset, userId } } }))?.locked ?? 0),
    listBalances: async (userId: string) =>
      Object.fromEntries(
        (await prisma.walletBalance.findMany({ where: { userId } })).map((value) => [value.asset, number(value.balance)])
      ),
    adjustBalance: async (userId: string, asset: string, delta: number) =>
      number(
        (
          await prisma.walletBalance.upsert({
            create: { asset, balance: delta, locked: 0, userId },
            update: { balance: { increment: delta } },
            where: { userId_asset: { asset, userId } },
          })
        ).balance
      ),
    reserve: async (userId: string, asset: string, amount: number) =>
      serializable(async (tx) => {
        const value = await tx.walletBalance.findUnique({ where: { userId_asset: { asset, userId } } });
        if (!value || value.balance.minus(value.locked).lessThan(amount)) return false;
        await tx.walletBalance.update({ data: { locked: { increment: amount } }, where: { userId_asset: { asset, userId } } });
        return true;
      }),
    release: async (userId: string, asset: string, amount: number) => {
      await prisma.$transaction(async (tx) => {
        const value = await tx.walletBalance.findUnique({ where: { userId_asset: { asset, userId } } });
        if (!value) return;
        await tx.walletBalance.update({ data: { locked: Prisma.Decimal.max(value.locked.minus(amount), 0) }, where: { userId_asset: { asset, userId } } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    },
    settleTrade: async (userId: string, base: string, quote: string, side: 'buy' | 'sell', amount: number, quoteAmount: number, feeAmount: number) =>
      serializable(async (tx) => {
        const [baseBalance, quoteBalance] = await Promise.all([
          tx.walletBalance.findUnique({ where: { userId_asset: { asset: base, userId } } }),
          tx.walletBalance.findUnique({ where: { userId_asset: { asset: quote, userId } } }),
        ]);
        if (side === 'buy') {
          const total = quoteAmount + feeAmount;
          if (!quoteBalance || quoteBalance.balance.minus(quoteBalance.locked).lessThan(total)) return false;
          await tx.walletBalance.update({ data: { balance: { decrement: total } }, where: { userId_asset: { asset: quote, userId } } });
          await tx.walletBalance.upsert({ create: { asset: base, balance: amount, locked: 0, userId }, update: { balance: { increment: amount } }, where: { userId_asset: { asset: base, userId } } });
        } else {
          if (!baseBalance || baseBalance.balance.minus(baseBalance.locked).lessThan(amount)) return false;
          await tx.walletBalance.update({ data: { balance: { decrement: amount } }, where: { userId_asset: { asset: base, userId } } });
          await tx.walletBalance.upsert({ create: { asset: quote, balance: quoteAmount - feeAmount, locked: 0, userId }, update: { balance: { increment: quoteAmount - feeAmount } }, where: { userId_asset: { asset: quote, userId } } });
        }
        return true;
      }),
    settlePurchase: async (userId: string, totalAmount: number, asset: string, assetAmount: number) =>
      serializable(async (tx) => {
        const fiat = await tx.walletBalance.findUnique({ where: { userId_asset: { asset: 'USD', userId } } });
        if (!fiat || fiat.balance.minus(fiat.locked).lessThan(totalAmount)) return false;
        await tx.walletBalance.update({ data: { balance: { decrement: totalAmount } }, where: { userId_asset: { asset: 'USD', userId } } });
        await tx.walletBalance.upsert({ create: { asset, balance: assetAmount, locked: 0, userId }, update: { balance: { increment: assetAmount } }, where: { userId_asset: { asset, userId } } });
        return true;
      }),
    settleConversion: async (userId: string, fromAsset: string, sourceAmount: number, toAsset: string, destinationAmount: number) =>
      prisma.$transaction(async (tx) => {
        const source = await tx.walletBalance.findUnique({ where: { userId_asset: { asset: fromAsset, userId } } });
        if (!source || source.balance.minus(source.locked).lessThan(sourceAmount)) return false;
        await tx.walletBalance.update({ data: { balance: { decrement: sourceAmount } }, where: { userId_asset: { asset: fromAsset, userId } } });
        await tx.walletBalance.upsert({ create: { asset: toAsset, balance: destinationAmount, locked: 0, userId }, update: { balance: { increment: destinationAmount } }, where: { userId_asset: { asset: toAsset, userId } } });
        return true;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
    listTransactions: async (userId: string): Promise<WalletTransactionRecord[]> =>
      (await prisma.walletTransaction.findMany({ orderBy: { createdAt: 'desc' }, where: { userId } })).map((value) => ({
        address: value.address ?? undefined,
        amount: number(value.amount), asset: value.asset, createdAt: iso(value.createdAt), id: value.id,
        network: value.network, status: 'completed', type: value.type, userId: value.userId,
      })),
    createTransaction: async (record: WalletTransactionRecord) => {
      await prisma.walletTransaction.create({ data: { ...record, createdAt: new Date(record.createdAt) } });
      return record;
    },
    executeTransfer: async (record: WalletTransactionRecord) =>
      serializable(async (tx) => {
        const balance = await tx.walletBalance.findUnique({ where: { userId_asset: { asset: record.asset, userId: record.userId } } });
        if (record.type === 'withdraw' && (!balance || balance.balance.minus(balance.locked).lessThan(record.amount)))
          return { kind: 'insufficient_balance' } as const;
        await tx.walletBalance.upsert({
          create: { asset: record.asset, balance: record.type === 'deposit' ? record.amount : -record.amount, locked: 0, userId: record.userId },
          update: { balance: { increment: record.type === 'deposit' ? record.amount : -record.amount } },
          where: { userId_asset: { asset: record.asset, userId: record.userId } },
        });
        await tx.walletTransaction.create({ data: { ...record, createdAt: new Date(record.createdAt) } });
        return { kind: 'success', transaction: record } as const;
      }),
  },
  purchaseRepository: {
    createQuote: async (record: PurchaseQuoteRecord) => purchaseQuoteRecord(await prisma.purchaseQuote.create({ data: { ...record, consumedAt: record.consumedAt ? new Date(record.consumedAt) : undefined, expiresAt: new Date(record.expiresAt) } })),
    findQuoteById: async (id: string) => { const value = await prisma.purchaseQuote.findUnique({ where: { id } }); return value ? purchaseQuoteRecord(value) : undefined; },
    consumeQuote: async (id: string, consumedAt: string) => { const result = await prisma.purchaseQuote.updateMany({ data: { consumedAt: new Date(consumedAt) }, where: { consumedAt: null, id } }); if (!result.count) return undefined; return purchaseQuoteRecord((await prisma.purchaseQuote.findUnique({ where: { id } }))!); },
    createOrder: async (record: PurchaseOrderRecord) => purchaseOrderRecord(await prisma.purchaseOrder.create({ data: { ...record, createdAt: new Date(record.createdAt) } })),
    findOrderById: async (id: string) => { const value = await prisma.purchaseOrder.findUnique({ where: { id } }); return value ? purchaseOrderRecord(value) : undefined; },
    findOrderByIdempotencyKey: async (userId: string, idempotencyKey: string) => { const value = await prisma.purchaseOrder.findUnique({ where: { userId_idempotencyKey: { idempotencyKey, userId } } }); return value ? purchaseOrderRecord(value) : undefined; },
    executeQuote: async (order: PurchaseOrderRecord, now: string) =>
      serializable(async (tx) => {
        const previous = await tx.purchaseOrder.findUnique({ where: { userId_idempotencyKey: { idempotencyKey: order.idempotencyKey, userId: order.userId } } });
        if (previous) return previous.quoteId === order.quoteId ? { kind: 'success', order: purchaseOrderRecord(previous) } as const : { kind: 'idempotency_conflict' } as const;
        const quote = await tx.purchaseQuote.findUnique({ where: { id: order.quoteId } });
        if (!quote || quote.userId !== order.userId) return { kind: 'not_found' } as const;
        if (quote.expiresAt <= new Date(now)) return { kind: 'expired' } as const;
        if (quote.consumedAt) return { kind: 'already_used' } as const;
        const fiat = await tx.walletBalance.findUnique({ where: { userId_asset: { asset: 'USD', userId: order.userId } } });
        if (!fiat || fiat.balance.minus(fiat.locked).lessThan(quote.totalAmount)) return { kind: 'insufficient_balance' } as const;
        const consumed = await tx.purchaseQuote.updateMany({ data: { consumedAt: new Date(now) }, where: { consumedAt: null, id: quote.id } });
        if (!consumed.count) return { kind: 'already_used' } as const;
        await tx.walletBalance.update({ data: { balance: { decrement: quote.totalAmount } }, where: { userId_asset: { asset: 'USD', userId: order.userId } } });
        await tx.walletBalance.upsert({ create: { asset: quote.asset, balance: quote.assetAmount, locked: 0, userId: order.userId }, update: { balance: { increment: quote.assetAmount } }, where: { userId_asset: { asset: quote.asset, userId: order.userId } } });
        const created = await tx.purchaseOrder.create({ data: { ...order, asset: quote.asset, assetAmount: quote.assetAmount, fiatAmount: quote.fiatAmount, fiatCurrency: quote.fiatCurrency, createdAt: new Date(order.createdAt) } });
        return { kind: 'success', order: purchaseOrderRecord(created) } as const;
      }),
  },
  conversionRepository: {
    createQuote: async (record: ConversionQuoteRecord) => conversionQuoteRecord(await prisma.conversionQuote.create({ data: { ...record, consumedAt: record.consumedAt ? new Date(record.consumedAt) : undefined, expiresAt: new Date(record.expiresAt) } })),
    findQuoteById: async (id: string) => { const value = await prisma.conversionQuote.findUnique({ where: { id } }); return value ? conversionQuoteRecord(value) : undefined; },
    consumeQuote: async (id: string, consumedAt: string) => { const result = await prisma.conversionQuote.updateMany({ data: { consumedAt: new Date(consumedAt) }, where: { consumedAt: null, id } }); if (!result.count) return undefined; return conversionQuoteRecord((await prisma.conversionQuote.findUnique({ where: { id } }))!); },
    createOrder: async (record: ConversionOrderRecord) => conversionOrderRecord(await prisma.conversionOrder.create({ data: { ...record, createdAt: new Date(record.createdAt) } })),
    findOrderById: async (id: string) => { const value = await prisma.conversionOrder.findUnique({ where: { id } }); return value ? conversionOrderRecord(value) : undefined; },
    findOrderByIdempotencyKey: async (userId: string, idempotencyKey: string) => { const value = await prisma.conversionOrder.findUnique({ where: { userId_idempotencyKey: { idempotencyKey, userId } } }); return value ? conversionOrderRecord(value) : undefined; },
    executeQuote: async (order: ConversionOrderRecord, now: string) =>
      serializable(async (tx) => {
        const previous = await tx.conversionOrder.findUnique({ where: { userId_idempotencyKey: { idempotencyKey: order.idempotencyKey, userId: order.userId } } });
        if (previous) return previous.quoteId === order.quoteId ? { kind: 'success', order: conversionOrderRecord(previous) } as const : { kind: 'idempotency_conflict' } as const;
        const quote = await tx.conversionQuote.findUnique({ where: { id: order.quoteId } });
        if (!quote || quote.userId !== order.userId) return { kind: 'not_found' } as const;
        if (quote.expiresAt <= new Date(now)) return { kind: 'expired' } as const;
        if (quote.consumedAt) return { kind: 'already_used' } as const;
        const source = await tx.walletBalance.findUnique({ where: { userId_asset: { asset: quote.fromAsset, userId: order.userId } } });
        if (!source || source.balance.minus(source.locked).lessThan(quote.sourceAmount)) return { kind: 'insufficient_balance' } as const;
        const consumed = await tx.conversionQuote.updateMany({ data: { consumedAt: new Date(now) }, where: { consumedAt: null, id: quote.id } });
        if (!consumed.count) return { kind: 'already_used' } as const;
        await tx.walletBalance.update({ data: { balance: { decrement: quote.sourceAmount } }, where: { userId_asset: { asset: quote.fromAsset, userId: order.userId } } });
        await tx.walletBalance.upsert({ create: { asset: quote.toAsset, balance: quote.destinationAmount, locked: 0, userId: order.userId }, update: { balance: { increment: quote.destinationAmount } }, where: { userId_asset: { asset: quote.toAsset, userId: order.userId } } });
        const created = await tx.conversionOrder.create({ data: { ...order, destinationAmount: quote.destinationAmount, fromAsset: quote.fromAsset, sourceAmount: quote.sourceAmount, toAsset: quote.toAsset, createdAt: new Date(order.createdAt) } });
        return { kind: 'success', order: conversionOrderRecord(created) } as const;
      }),
  },
  supportRepository: {
    createTicket: async (ticket: SupportTicketRecord, message: SupportMessageRecord) => {
      await prisma.$transaction([
        prisma.supportTicket.create({ data: { ...ticket, createdAt: new Date(ticket.createdAt), updatedAt: new Date(ticket.updatedAt) } }),
        prisma.supportMessage.create({ data: { ...message, createdAt: new Date(message.createdAt) } }),
      ]);
      return ticket;
    },
    findTicketById: async (id: string) => { const value = await prisma.supportTicket.findUnique({ where: { id } }); return value ? supportTicketRecord(value) : undefined; },
    listMessages: async (ticketId: string) => (await prisma.supportMessage.findMany({ orderBy: { createdAt: 'asc' }, where: { ticketId } })).map(supportMessageRecord),
    listTicketsByUser: async (userId: string) => (await prisma.supportTicket.findMany({ orderBy: { updatedAt: 'desc' }, where: { userId } })).map(supportTicketRecord),
    listTickets: async () => (await prisma.supportTicket.findMany({ orderBy: { updatedAt: 'desc' } })).map(supportTicketRecord),
    addMessage: async (record: SupportMessageRecord) => supportMessageRecord(await prisma.supportMessage.create({ data: { ...record, createdAt: new Date(record.createdAt) } })),
    updateTicket: async (id: string, patch: Partial<SupportTicketRecord>) => { const value = await prisma.supportTicket.update({ data: { ...patch, createdAt: patch.createdAt ? new Date(patch.createdAt) : undefined, updatedAt: patch.updatedAt ? new Date(patch.updatedAt) : undefined }, where: { id } }).catch(() => null); return value ? supportTicketRecord(value) : undefined; },
  },
  verificationRepository: {
    findByUser: async (userId: string) => { const value = await prisma.verification.findUnique({ where: { userId } }); return value ? verificationRecord(value) : undefined; },
    save: async (record: VerificationRecord) => {
      const data = { country: record.country, documentData: record.documentData ? Uint8Array.from(record.documentData) : undefined, documentId: record.document?.id, documentMimeType: record.document?.mimeType, documentName: record.document?.name, documentSize: record.document?.size, documentUploadedAt: record.document ? new Date(record.document.uploadedAt) : undefined, fullName: record.fullName, nationalId: record.nationalId, status: record.status, submittedAt: record.submittedAt ? new Date(record.submittedAt) : undefined, updatedAt: new Date(record.updatedAt), userId: record.userId };
      return verificationRecord(await prisma.verification.upsert({ create: data, update: data, where: { userId: record.userId } }));
    },
    list: async () => (await prisma.verification.findMany({ orderBy: { updatedAt: 'desc' } })).map(verificationRecord),
  },
  adminSettingsRepository: {
    get: async (): Promise<AdminSettingsRecord> => {
      const value = await prisma.adminSettings.findUniqueOrThrow({ where: { id: 1 } });
      return { minimumWithdrawal: number(value.minimumWithdrawal), networkEnabled: value.networkEnabled, paymentProvider: value.paymentProvider === 'provider_a' ? 'provider-a' : 'manual', tradingFeePercent: number(value.tradingFeePercent), updatedAt: iso(value.updatedAt), withdrawalsEnabled: value.withdrawalsEnabled };
    },
    update: async (record: AdminSettingsRecord): Promise<AdminSettingsRecord> => {
      const value = await prisma.adminSettings.upsert({ create: { ...record, id: 1, paymentProvider: record.paymentProvider === 'provider-a' ? 'provider_a' : 'manual', updatedAt: new Date(record.updatedAt) }, update: { ...record, paymentProvider: record.paymentProvider === 'provider-a' ? 'provider_a' : 'manual', updatedAt: new Date(record.updatedAt) }, where: { id: 1 } });
      return { ...record, updatedAt: iso(value.updatedAt) };
    },
  },
  auditRepository: {
    add: async (record: AuditEventRecord) => { await prisma.auditEvent.create({ data: { ...record, createdAt: new Date(record.createdAt), metadata: record.metadata ?? undefined } }); return record; },
    list: async (): Promise<AuditEventRecord[]> => (await prisma.auditEvent.findMany({ orderBy: { createdAt: 'desc' } })).map((value) => ({ action: value.action, actorId: value.actorId, createdAt: iso(value.createdAt), id: value.id, metadata: value.metadata as AuditEventRecord['metadata'], targetId: value.targetId, targetType: value.targetType })),
  },
  bankCardRepository: {
    create: async (record: BankCardRecord) => { await prisma.bankCard.create({ data: { ...record, createdAt: new Date(record.createdAt) } }); return record; },
    delete: async (userId: string, id: string) => { const value = await prisma.bankCard.findFirst({ where: { id, userId } }); if (!value) return undefined; await prisma.bankCard.delete({ where: { id } }); return { ...value, createdAt: iso(value.createdAt) }; },
    findByFingerprint: async (userId: string, fingerprint: string) => { const value = await prisma.bankCard.findUnique({ where: { userId_fingerprint: { fingerprint, userId } } }); return value ? { ...value, createdAt: iso(value.createdAt) } : undefined; },
    findById: async (userId: string, id: string) => { const value = await prisma.bankCard.findFirst({ where: { id, userId } }); return value ? { ...value, createdAt: iso(value.createdAt) } : undefined; },
    listByUser: async (userId: string) => (await prisma.bankCard.findMany({ orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }], where: { userId } })).map((value) => ({ ...value, createdAt: iso(value.createdAt) })),
    setDefault: async (userId: string, id: string) => prisma.$transaction(async (tx) => { const value = await tx.bankCard.findFirst({ where: { id, userId } }); if (!value) return undefined; await tx.bankCard.updateMany({ data: { isDefault: false }, where: { userId } }); const selected = await tx.bankCard.update({ data: { isDefault: true }, where: { id } }); return { ...selected, createdAt: iso(selected.createdAt) }; }),
  },
  referralRepository: {
    listByUser: async (userId: string): Promise<ReferralRecord[]> => (await prisma.referral.findMany({ orderBy: { createdAt: 'desc' }, where: { userId } })).map((value) => ({ createdAt: iso(value.createdAt), id: value.id, inviteeName: value.inviteeName, rewardAmount: number(value.rewardAmount), status: value.status, userId: value.userId })),
  },
  sessionRepository: {
    create: async (record: SessionRecord) => { await prisma.session.create({ data: { ...record, createdAt: new Date(record.createdAt), expiresAt: new Date(record.expiresAt), lastActiveAt: new Date(record.lastActiveAt) } }); return record; },
    findById: async (id: string) => { const value = await prisma.session.findUnique({ where: { id } }); return value ? { ...value, createdAt: iso(value.createdAt), expiresAt: value.expiresAt.getTime(), lastActiveAt: iso(value.lastActiveAt) } : undefined; },
    touch: async (id: string, lastActiveAt: string) => { await prisma.session.updateMany({ data: { lastActiveAt: new Date(lastActiveAt) }, where: { id } }); },
    delete: async (id: string) => { await prisma.session.deleteMany({ where: { id } }); },
    listByUser: async (userId: string) => (await prisma.session.findMany({ orderBy: { lastActiveAt: 'desc' }, where: { expiresAt: { gt: new Date() }, userId } })).map((value) => ({ ...value, createdAt: iso(value.createdAt), expiresAt: value.expiresAt.getTime(), lastActiveAt: iso(value.lastActiveAt) })),
    deleteOthers: async (userId: string, currentId: string) => { await prisma.session.deleteMany({ where: { id: { not: currentId }, userId } }); },
  },
  mfaRepository: {
    isEnabled: async (userId: string) => Boolean(await prisma.mfaCredential.findUnique({ select: { userId: true }, where: { userId } })),
    createPending: async (id: string, userId: string, secret: string, expiresAt: number) => { await prisma.pendingMfaSetup.create({ data: { expiresAt: new Date(expiresAt), id, secret, userId } }); },
    getPending: async (id: string) => { const value = await prisma.pendingMfaSetup.findUnique({ where: { id } }); return value ? { expiresAt: value.expiresAt.getTime(), secret: value.secret, userId: value.userId } : undefined; },
    deletePending: async (id: string) => { await prisma.pendingMfaSetup.deleteMany({ where: { id } }); },
    enable: async (userId: string, secret: string, hashes: string[]) => { await prisma.$transaction(async (tx) => { await tx.mfaCredential.upsert({ create: { secret, userId }, update: { secret }, where: { userId } }); await tx.mfaRecoveryCode.deleteMany({ where: { userId } }); await tx.mfaRecoveryCode.createMany({ data: hashes.map((hash) => ({ hash, userId })) }); }); },
    getSecret: async (userId: string) => (await prisma.mfaCredential.findUnique({ where: { userId } }))?.secret,
    consumeRecoveryCode: async (userId: string, hash: string) => Boolean((await prisma.mfaRecoveryCode.deleteMany({ where: { hash, userId } })).count),
    disable: async (userId: string) => { await prisma.mfaCredential.deleteMany({ where: { userId } }); },
  },
} satisfies Record<string, Record<string, (...args: never[]) => unknown>>;

export type PrismaRepositories = typeof prismaRepositories;

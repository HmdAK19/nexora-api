import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const users = [
  { id: 'user-demo', email: 'demo@nexora.dev', name: 'Hamed Akbarzadeh', role: 'admin' as const },
  {
    id: 'user-customer-demo',
    email: 'customer@nexora.dev',
    name: 'Customer Demo',
    role: 'customer' as const,
  },
];

const balances: Record<string, number> = {
  ADA: 12100,
  BTC: 0.8421,
  DOGE: 32000,
  ETH: 5.438,
  SOL: 72.4,
  USD: 100000,
  USDT: 24320.5,
  XRP: 4860,
};

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD;
  if (!adminPassword || !customerPassword)
    throw new Error('SEED_ADMIN_PASSWORD and SEED_CUSTOMER_PASSWORD are required');
  const passwordChangedAt = new Date(Date.now() - 43 * 86_400_000);

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.role === 'admin' ? adminPassword : customerPassword, 12);
    await prisma.user.upsert({
      create: {
        ...user,
        level: 'verified',
        passwordChangedAt,
        passwordHash,
        status: 'active',
      },
      update: { email: user.email, name: user.name, passwordChangedAt, passwordHash, role: user.role },
      where: { id: user.id },
    });
    await prisma.accountProfile.upsert({
      create: { phone: user.role === 'admin' ? '+98 912 000 0000' : '+98 912 000 0001', userId: user.id },
      update: {},
      where: { userId: user.id },
    });
    await prisma.accountPreferences.upsert({
      create: {
        colorMode: 'dark',
        language: 'fa',
        priceAlerts: true,
        tradingNotifications: true,
        userId: user.id,
      },
      update: {},
      where: { userId: user.id },
    });
  }

  for (const [asset, balance] of Object.entries(balances)) {
    await prisma.walletBalance.upsert({
      create: { asset, balance, locked: asset === 'USDT' ? 4275 : 0, userId: 'user-demo' },
      update: {},
      where: { userId_asset: { asset, userId: 'user-demo' } },
    });
  }

  await prisma.notification.createMany({
    data: [
      {
        actionPath: '/verification',
        createdAt: new Date(),
        id: 'notification-verification-demo',
        kind: 'verification_reminder',
        metadata: {},
        userId: 'user-demo',
      },
      {
        actionPath: '/settings',
        createdAt: new Date(),
        id: 'notification-security-customer',
        kind: 'security_recommendation',
        metadata: {},
        userId: 'user-customer-demo',
      },
    ],
    skipDuplicates: true,
  });

  await prisma.adminSettings.upsert({
    create: {
      id: 1,
      minimumWithdrawal: 10,
      networkEnabled: true,
      paymentProvider: 'manual',
      tradingFeePercent: 0.08,
      updatedAt: new Date(),
      withdrawalsEnabled: true,
    },
    update: {},
    where: { id: 1 },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

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

  const seededUserIds = new Map<string, string>();

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.role === 'admin' ? adminPassword : customerPassword, 12);
    const seededUser = await prisma.user.upsert({
      create: {
        ...user,
        level: 'verified',
        passwordChangedAt,
        passwordHash,
        status: 'active',
      },
      update: {
        level: 'verified',
        name: user.name,
        passwordChangedAt,
        passwordHash,
        role: user.role,
        status: 'active',
      },
      where: { email: user.email },
    });
    seededUserIds.set(user.id, seededUser.id);
    await prisma.accountProfile.upsert({
      create: {
        phone: user.role === 'admin' ? '+98 912 000 0000' : '+98 912 000 0001',
        userId: seededUser.id,
      },
      update: {},
      where: { userId: seededUser.id },
    });
    await prisma.accountPreferences.upsert({
      create: {
        colorMode: 'dark',
        language: 'fa',
        priceAlerts: true,
        tradingNotifications: true,
        userId: seededUser.id,
      },
      update: {},
      where: { userId: seededUser.id },
    });
  }

  const adminUserId = seededUserIds.get('user-demo');
  const customerUserId = seededUserIds.get('user-customer-demo');
  if (!adminUserId || !customerUserId) throw new Error('Demo users were not created');

  for (const [asset, balance] of Object.entries(balances)) {
    await prisma.walletBalance.upsert({
      create: { asset, balance, locked: asset === 'USDT' ? 4275 : 0, userId: adminUserId },
      update: {},
      where: { userId_asset: { asset, userId: adminUserId } },
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
        userId: adminUserId,
      },
      {
        actionPath: '/settings',
        createdAt: new Date(),
        id: 'notification-security-customer',
        kind: 'security_recommendation',
        metadata: {},
        userId: customerUserId,
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

  const demoUserCount = await prisma.user.count({
    where: { email: { in: users.map(({ email }) => email) } },
  });
  if (demoUserCount !== users.length) {
    throw new Error(`Seed verification failed: expected ${users.length} demo users, found ${demoUserCount}`);
  }

  console.info(`Seed completed and verified: ${demoUserCount} demo users are available`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

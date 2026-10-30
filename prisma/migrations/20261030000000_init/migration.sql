-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'compliance', 'customer', 'operations', 'support');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'blocked');

-- CreateEnum
CREATE TYPE "VerificationLevel" AS ENUM ('basic', 'verified', 'advanced');

-- CreateEnum
CREATE TYPE "ColorMode" AS ENUM ('dark', 'light');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('en', 'fa');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('order_placed', 'security_recommendation', 'verification_reminder');

-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('buy', 'sell');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('limit', 'market');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('open', 'filled', 'cancelled');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('deposit', 'withdraw');

-- CreateEnum
CREATE TYPE "ProcessStatus" AS ENUM ('completed', 'failed', 'pending');

-- CreateEnum
CREATE TYPE "SupportCategory" AS ENUM ('account', 'security', 'trading', 'verification', 'wallet');

-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('closed', 'open', 'waiting_for_support', 'waiting_for_user');

-- CreateEnum
CREATE TYPE "MessageAuthor" AS ENUM ('support', 'user');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('draft', 'not_started', 'pending', 'ready', 'rejected', 'verified');

-- CreateEnum
CREATE TYPE "VerificationCountry" AS ENUM ('AE', 'IR', 'TR');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('manual', 'provider_a');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('joined', 'qualified', 'rewarded');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordChangedAt" TIMESTAMP(3) NOT NULL,
    "level" "VerificationLevel" NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountProfile" (
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "avatarData" BYTEA,
    "avatarMime" TEXT,

    CONSTRAINT "AccountProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AccountPreferences" (
    "userId" TEXT NOT NULL,
    "colorMode" "ColorMode" NOT NULL,
    "language" "Language" NOT NULL,
    "priceAlerts" BOOLEAN NOT NULL,
    "tradingNotifications" BOOLEAN NOT NULL,

    CONSTRAINT "AccountPreferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "browser" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingMfaSetup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingMfaSetup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfaCredential" (
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,

    CONSTRAINT "MfaCredential_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "MfaRecoveryCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "MfaRecoveryCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "metadata" JSONB NOT NULL,
    "actionPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletBalance" (
    "userId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "balance" DECIMAL(36,18) NOT NULL,
    "locked" DECIMAL(36,18) NOT NULL,

    CONSTRAINT "WalletBalance_pkey" PRIMARY KEY ("userId","asset")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "type" "TransferType" NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "network" TEXT NOT NULL,
    "address" TEXT,
    "status" "ProcessStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" "OrderSide" NOT NULL,
    "type" "OrderType" NOT NULL,
    "price" DECIMAL(36,18) NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "filled" DECIMAL(7,4) NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "averagePrice" DECIMAL(36,18) NOT NULL,
    "feeAmount" DECIMAL(36,18) NOT NULL,
    "quoteAmount" DECIMAL(36,18) NOT NULL,
    "idempotencyKey" TEXT,
    "reservedAsset" TEXT,
    "reservedAmount" DECIMAL(36,18),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseQuote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "assetAmount" DECIMAL(36,18) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "feeAmount" DECIMAL(36,18) NOT NULL,
    "fiatAmount" DECIMAL(36,18) NOT NULL,
    "fiatCurrency" TEXT NOT NULL,
    "totalAmount" DECIMAL(36,18) NOT NULL,
    "unitPrice" DECIMAL(36,18) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "PurchaseQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "assetAmount" DECIMAL(36,18) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "fiatAmount" DECIMAL(36,18) NOT NULL,
    "fiatCurrency" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "status" "ProcessStatus" NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversionQuote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "destinationAmount" DECIMAL(36,18) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "feeAmount" DECIMAL(36,18) NOT NULL,
    "fromAsset" TEXT NOT NULL,
    "rate" DECIMAL(36,18) NOT NULL,
    "sourceAmount" DECIMAL(36,18) NOT NULL,
    "toAsset" TEXT NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "ConversionQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversionOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "destinationAmount" DECIMAL(36,18) NOT NULL,
    "fromAsset" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "sourceAmount" DECIMAL(36,18) NOT NULL,
    "status" "ProcessStatus" NOT NULL,
    "toAsset" TEXT NOT NULL,

    CONSTRAINT "ConversionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "SupportCategory" NOT NULL,
    "status" "SupportStatus" NOT NULL,
    "subject" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "author" "MessageAuthor" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "userId" TEXT NOT NULL,
    "country" "VerificationCountry",
    "fullName" TEXT,
    "nationalId" TEXT,
    "status" "VerificationStatus" NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "documentId" TEXT,
    "documentMimeType" TEXT,
    "documentName" TEXT,
    "documentSize" INTEGER,
    "documentUploadedAt" TIMESTAMP(3),
    "documentData" BYTEA,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "BankCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "maskedIban" TEXT NOT NULL,
    "maskedNumber" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inviteeName" TEXT NOT NULL,
    "rewardAmount" DECIMAL(36,18) NOT NULL,
    "status" "ReferralStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "minimumWithdrawal" DECIMAL(36,18) NOT NULL,
    "networkEnabled" BOOLEAN NOT NULL,
    "paymentProvider" "PaymentProvider" NOT NULL,
    "tradingFeePercent" DECIMAL(10,6) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "withdrawalsEnabled" BOOLEAN NOT NULL,

    CONSTRAINT "AdminSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "PendingMfaSetup_userId_idx" ON "PendingMfaSetup"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MfaRecoveryCode_hash_key" ON "MfaRecoveryCode"("hash");

-- CreateIndex
CREATE INDEX "MfaRecoveryCode_userId_idx" ON "MfaRecoveryCode"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Order_userId_idempotencyKey_key" ON "Order"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "PurchaseQuote_userId_expiresAt_idx" ON "PurchaseQuote"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "PurchaseOrder_userId_createdAt_idx" ON "PurchaseOrder"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_userId_idempotencyKey_key" ON "PurchaseOrder"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ConversionQuote_userId_expiresAt_idx" ON "ConversionQuote"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "ConversionOrder_userId_createdAt_idx" ON "ConversionOrder"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ConversionOrder_userId_idempotencyKey_key" ON "ConversionOrder"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_updatedAt_idx" ON "SupportTicket"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "Verification_status_updatedAt_idx" ON "Verification"("status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "BankCard_userId_isDefault_createdAt_idx" ON "BankCard"("userId", "isDefault", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BankCard_userId_fingerprint_key" ON "BankCard"("userId", "fingerprint");

-- CreateIndex
CREATE INDEX "Referral_userId_createdAt_idx" ON "Referral"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "AccountProfile" ADD CONSTRAINT "AccountProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountPreferences" ADD CONSTRAINT "AccountPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingMfaSetup" ADD CONSTRAINT "PendingMfaSetup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaCredential" ADD CONSTRAINT "MfaCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaRecoveryCode" ADD CONSTRAINT "MfaRecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MfaCredential"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletBalance" ADD CONSTRAINT "WalletBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseQuote" ADD CONSTRAINT "PurchaseQuote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "PurchaseQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversionQuote" ADD CONSTRAINT "ConversionQuote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversionOrder" ADD CONSTRAINT "ConversionOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversionOrder" ADD CONSTRAINT "ConversionOrder_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "ConversionQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankCard" ADD CONSTRAINT "BankCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

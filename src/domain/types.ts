export type UserRole = 'admin' | 'compliance' | 'customer' | 'operations' | 'support';

export type Permission =
  | 'admin:audit:read'
  | 'admin:overview:read'
  | 'admin:settings:manage'
  | 'admin:settings:read'
  | 'admin:support:read'
  | 'admin:support:reply'
  | 'admin:users:read'
  | 'admin:verification:read'
  | 'admin:verification:review'
  | 'cards:access'
  | 'convert:access'
  | 'dashboard:access'
  | 'markets:access'
  | 'orders:access'
  | 'purchase:access'
  | 'referrals:access'
  | 'support:access'
  | 'verification:access'
  | 'wallet:access';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  passwordChangedAt: string;
  level: 'basic' | 'verified' | 'advanced';
  role: UserRole;
  status: 'active' | 'blocked';
}

export interface CreateUserRecord {
  language: 'en' | 'fa';
  phone: string;
  termsAcceptedAt: string;
  user: UserRecord;
}

export interface AdminSettingsRecord {
  minimumWithdrawal: number;
  networkEnabled: boolean;
  paymentProvider: 'manual' | 'provider-a';
  tradingFeePercent: number;
  updatedAt: string;
  withdrawalsEnabled: boolean;
}

export interface AuditEventRecord {
  action: string;
  actorId: string;
  createdAt: string;
  id: string;
  metadata?: Record<string, string | number | boolean>;
  targetId: string;
  targetType: string;
}
export interface TokenClaims {
  sub: string;
  email: string;
  type: 'access' | 'refresh';
  jti?: string;
}

export interface SessionContext {
  browser: string;
  device: string;
  ipAddress: string;
  location: string;
}

export interface SessionRecord extends SessionContext {
  createdAt: string;
  expiresAt: number;
  id: string;
  lastActiveAt: string;
  userId: string;
}

export interface AccountProfileRecord {
  avatar?: { data: Buffer; mimeType: 'image/jpeg' | 'image/png' | 'image/webp' };
  phone: string;
  userId: string;
}

export interface AccountPreferencesRecord {
  colorMode: 'dark' | 'light';
  language: 'en' | 'fa';
  priceAlerts: boolean;
  tradingNotifications: boolean;
  userId: string;
}

export type NotificationKind = 'order_placed' | 'security_recommendation' | 'verification_reminder';

export interface NotificationRecord {
  actionPath: string;
  createdAt: string;
  id: string;
  kind: NotificationKind;
  metadata: Record<string, string>;
  readAt: string | null;
  userId: string;
}
export interface OrderRecord {
  id: string;
  userId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  price: number;
  amount: number;
  filled: number;
  status: 'open' | 'filled' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  averagePrice: number;
  feeAmount: number;
  quoteAmount: number;
  idempotencyKey?: string;
  reservedAsset?: string;
  reservedAmount?: number;
}
export interface WalletTransactionRecord {
  id: string;
  userId: string;
  asset: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  network: string;
  address?: string;
  status: 'completed';
  createdAt: string;
}

export interface PurchaseQuoteRecord {
  id: string;
  userId: string;
  asset: string;
  assetAmount: number;
  expiresAt: string;
  feeAmount: number;
  fiatAmount: number;
  fiatCurrency: 'USD';
  totalAmount: number;
  unitPrice: number;
  consumedAt?: string;
}

export interface PurchaseOrderRecord {
  id: string;
  userId: string;
  asset: string;
  assetAmount: number;
  createdAt: string;
  fiatAmount: number;
  fiatCurrency: 'USD';
  idempotencyKey: string;
  quoteId: string;
  status: 'completed' | 'failed' | 'pending';
}

export interface ConversionQuoteRecord {
  id: string;
  userId: string;
  destinationAmount: number;
  expiresAt: string;
  feeAmount: number;
  fromAsset: string;
  rate: number;
  sourceAmount: number;
  toAsset: string;
  consumedAt?: string;
}

export interface ConversionOrderRecord {
  id: string;
  userId: string;
  createdAt: string;
  destinationAmount: number;
  fromAsset: string;
  idempotencyKey: string;
  quoteId: string;
  sourceAmount: number;
  status: 'completed' | 'failed' | 'pending';
  toAsset: string;
}

export type SupportCategory = 'account' | 'security' | 'trading' | 'verification' | 'wallet';
export type SupportStatus = 'closed' | 'open' | 'waiting_for_support' | 'waiting_for_user';

export interface SupportMessageRecord {
  author: 'support' | 'user';
  body: string;
  createdAt: string;
  id: string;
  ticketId: string;
}

export interface SupportTicketRecord {
  category: SupportCategory;
  createdAt: string;
  id: string;
  status: SupportStatus;
  subject: string;
  updatedAt: string;
  userId: string;
}

export interface VerificationRecord {
  country?: 'AE' | 'IR' | 'TR';
  document?: { id: string; mimeType: string; name: string; size: number; uploadedAt: string };
  documentData?: Buffer;
  fullName?: string;
  nationalId?: string;
  status: 'draft' | 'not_started' | 'pending' | 'ready' | 'rejected' | 'verified';
  submittedAt?: string;
  updatedAt: string;
  userId: string;
}

export interface BankCardRecord {
  createdAt: string;
  fingerprint: string;
  id: string;
  isDefault: boolean;
  maskedIban: string;
  maskedNumber: string;
  userId: string;
}

export type ReferralStatus = 'joined' | 'qualified' | 'rewarded';

export interface ReferralRecord {
  createdAt: string;
  id: string;
  inviteeName: string;
  rewardAmount: number;
  status: ReferralStatus;
  userId: string;
}

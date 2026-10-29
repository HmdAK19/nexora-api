import type { Permission, UserRole } from './types.js';

export const PERMISSIONS = {
  admin: {
    auditRead: 'admin:audit:read',
    overviewRead: 'admin:overview:read',
    settingsManage: 'admin:settings:manage',
    settingsRead: 'admin:settings:read',
    supportRead: 'admin:support:read',
    supportReply: 'admin:support:reply',
    usersRead: 'admin:users:read',
    verificationRead: 'admin:verification:read',
    verificationReview: 'admin:verification:review',
  },
  cards: 'cards:access',
  convert: 'convert:access',
  dashboard: 'dashboard:access',
  markets: 'markets:access',
  orders: 'orders:access',
  purchase: 'purchase:access',
  referrals: 'referrals:access',
  support: 'support:access',
  verification: 'verification:access',
  wallet: 'wallet:access',
} as const satisfies Record<string, Permission | Record<string, Permission>>;

const customerPermissions = [
  PERMISSIONS.cards,
  PERMISSIONS.convert,
  PERMISSIONS.dashboard,
  PERMISSIONS.markets,
  PERMISSIONS.orders,
  PERMISSIONS.purchase,
  PERMISSIONS.referrals,
  PERMISSIONS.support,
  PERMISSIONS.verification,
  PERMISSIONS.wallet,
] as const satisfies readonly Permission[];

const permissionsByRole = {
  admin: [
    ...customerPermissions,
    PERMISSIONS.admin.auditRead,
    PERMISSIONS.admin.overviewRead,
    PERMISSIONS.admin.settingsManage,
    PERMISSIONS.admin.settingsRead,
    PERMISSIONS.admin.supportRead,
    PERMISSIONS.admin.supportReply,
    PERMISSIONS.admin.usersRead,
    PERMISSIONS.admin.verificationRead,
    PERMISSIONS.admin.verificationReview,
  ],
  compliance: [
    PERMISSIONS.admin.usersRead,
    PERMISSIONS.admin.verificationRead,
    PERMISSIONS.admin.verificationReview,
  ],
  customer: customerPermissions,
  operations: [PERMISSIONS.admin.overviewRead, PERMISSIONS.admin.settingsRead],
  support: [PERMISSIONS.admin.usersRead, PERMISSIONS.admin.supportRead, PERMISSIONS.admin.supportReply],
} as const satisfies Record<UserRole, readonly Permission[]>;

export const getPermissionsForRole = (role: UserRole): readonly Permission[] => permissionsByRole[role];

export const roleHasPermission = (role: UserRole, permission: Permission): boolean =>
  getPermissionsForRole(role).includes(permission);

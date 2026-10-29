import { describe, expect, it } from 'vitest';

import { PERMISSIONS, roleHasPermission } from './authorization.js';

describe('authorization policy', () => {
  it('grants customer product access without administration access', () => {
    expect(roleHasPermission('customer', PERMISSIONS.wallet)).toBe(true);
    expect(roleHasPermission('customer', PERMISSIONS.admin.overviewRead)).toBe(false);
  });

  it('grants the administrator explicit administration permissions', () => {
    expect(roleHasPermission('admin', PERMISSIONS.admin.overviewRead)).toBe(true);
    expect(roleHasPermission('admin', PERMISSIONS.admin.settingsManage)).toBe(true);
  });

  it('keeps operator roles limited to their workspaces', () => {
    expect(roleHasPermission('support', PERMISSIONS.admin.supportReply)).toBe(true);
    expect(roleHasPermission('support', PERMISSIONS.admin.settingsManage)).toBe(false);
    expect(roleHasPermission('compliance', PERMISSIONS.admin.verificationReview)).toBe(true);
    expect(roleHasPermission('operations', PERMISSIONS.admin.settingsRead)).toBe(true);
  });
});

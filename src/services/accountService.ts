import bcrypt from 'bcryptjs';

import type { AccountPreferencesRecord } from '../domain/index.js';
import {
  accountPreferencesRepository,
  accountProfileRepository,
  userRepository,
} from '../repositories/index.js';
import { tokenService } from './tokenService.js';
import { mfaService } from './mfaService.js';

export class AccountSecurityError extends Error {
  constructor(
    readonly code:
      | 'CURRENT_SESSION'
      | 'INVALID_AVATAR'
      | 'INVALID_CURRENT_PASSWORD'
      | 'PASSWORD_REUSED'
      | 'SESSION_NOT_FOUND',
    readonly status: number
  ) {
    super(code);
  }
}

export const accountService = {
  async getProfile(userId: string) {
    const [user, profile] = await Promise.all([
      userRepository.findById(userId),
      accountProfileRepository.get(userId),
    ]);
    if (!user || !profile) throw new AccountSecurityError('SESSION_NOT_FOUND', 404);
    return {
      avatarUrl: profile.avatar
        ? `data:${profile.avatar.mimeType};base64,${profile.avatar.data.toString('base64')}`
        : null,
      email: user.email,
      name: user.name,
      phone: profile.phone,
    };
  },

  async updateProfile(userId: string, input: { name: string; phone: string }) {
    if (!(await userRepository.updateName(userId, input.name))) {
      throw new AccountSecurityError('SESSION_NOT_FOUND', 404);
    }
    await accountProfileRepository.update(userId, { phone: input.phone });
    return accountService.getProfile(userId);
  },

  async updateAvatar(userId: string, mimeType: 'image/jpeg' | 'image/png' | 'image/webp', data: Buffer) {
    const valid = {
      'image/jpeg': data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
      'image/png': data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      'image/webp': data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP',
    }[mimeType];
    if (!data.length || !valid) throw new AccountSecurityError('INVALID_AVATAR', 400);
    await accountProfileRepository.update(userId, { avatar: { data: Buffer.from(data), mimeType } });
    return accountService.getProfile(userId);
  },

  async getPreferences(userId: string) {
    const preferences = await accountPreferencesRepository.get(userId);
    if (!preferences) throw new AccountSecurityError('SESSION_NOT_FOUND', 404);
    return {
      colorMode: preferences.colorMode,
      language: preferences.language,
      priceAlerts: preferences.priceAlerts,
      tradingNotifications: preferences.tradingNotifications,
    };
  },

  async updatePreferences(userId: string, input: Omit<AccountPreferencesRecord, 'userId'>) {
    await accountPreferencesRepository.update({ ...input, userId });
    return accountService.getPreferences(userId);
  },

  async getSecurity(userId: string, currentSessionId: string) {
    const [user, sessions, twoFactorEnabled] = await Promise.all([
      userRepository.findById(userId),
      tokenService.listSessions(userId),
      mfaService.isEnabled(userId),
    ]);
    if (!user) throw new AccountSecurityError('SESSION_NOT_FOUND', 404);

    return {
      passwordChangedAt: user.passwordChangedAt,
      sessions: sessions.map((session) => ({
        browser: session.browser,
        current: session.id === currentSessionId,
        device: session.device,
        id: session.id,
        ipAddress: session.ipAddress,
        lastActiveAt: session.lastActiveAt,
        location: session.location,
      })),
      twoFactorEnabled,
    };
  },

  async changePassword(userId: string, currentSessionId: string, currentPassword: string, newPassword: string) {
    const user = await userRepository.findById(userId);
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new AccountSecurityError('INVALID_CURRENT_PASSWORD', 400);
    }
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      throw new AccountSecurityError('PASSWORD_REUSED', 400);
    }

    await userRepository.updatePassword(userId, await bcrypt.hash(newPassword, 12));
    await tokenService.revokeOtherSessions(userId, currentSessionId);
  },

  async revokeSession(userId: string, currentSessionId: string, sessionId: string) {
    const result = await tokenService.revokeSession(userId, sessionId, currentSessionId);
    if (result === 'current') throw new AccountSecurityError('CURRENT_SESSION', 409);
    if (result === 'not-found') throw new AccountSecurityError('SESSION_NOT_FOUND', 404);
  },

  async beginMfaSetup(userId: string, currentPassword: string) {
    const user = await userRepository.findById(userId);
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new AccountSecurityError('INVALID_CURRENT_PASSWORD', 400);
    }
    return mfaService.beginSetup(user.id, user.email);
  },

  async confirmMfaSetup(userId: string, setupToken: string, code: string) {
    return { recoveryCodes: await mfaService.confirmSetup(userId, setupToken, code) };
  },

  async disableMfa(userId: string, currentPassword: string, code: string) {
    const user = await userRepository.findById(userId);
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new AccountSecurityError('INVALID_CURRENT_PASSWORD', 400);
    }
    await mfaService.disable(userId, code);
  },
};

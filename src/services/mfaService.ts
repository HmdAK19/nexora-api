import { createHmac, randomBytes, randomUUID } from 'node:crypto';

import { config } from '../config.js';
import { mfaRepository } from '../repositories/index.js';
import { encodeBase32, verifyTotp } from './totp.js';

const hashRecoveryCode = (code: string) =>
  createHmac('sha256', config.mfaRecoverySecret).update(code.toUpperCase()).digest('hex');
const createRecoveryCode = () => randomBytes(5).toString('hex').toUpperCase().match(/.{1,5}/g)!.join('-');

export class MfaError extends Error {
  constructor(
    readonly code: 'INVALID_MFA_CODE' | 'MFA_ALREADY_ENABLED' | 'MFA_NOT_ENABLED' | 'MFA_SETUP_EXPIRED',
    readonly status: number
  ) {
    super(code);
  }
}

export const mfaService = {
  isEnabled: (userId: string) => mfaRepository.isEnabled(userId),

  async beginSetup(userId: string, email: string) {
    if (await mfaRepository.isEnabled(userId)) throw new MfaError('MFA_ALREADY_ENABLED', 409);
    const secret = encodeBase32(randomBytes(20));
    const setupToken = randomUUID();
    const expiresAt = Date.now() + 10 * 60_000;
    await mfaRepository.createPending(setupToken, userId, secret, expiresAt);
    return {
      expiresAt: new Date(expiresAt).toISOString(),
      otpauthUri: `otpauth://totp/Nexora:${encodeURIComponent(email)}?secret=${secret}&issuer=Nexora&algorithm=SHA1&digits=6&period=30`,
      secret,
      setupToken,
    };
  },

  async confirmSetup(userId: string, setupToken: string, code: string) {
    const setup = await mfaRepository.getPending(setupToken);
    if (!setup || setup.userId !== userId || setup.expiresAt <= Date.now()) {
      await mfaRepository.deletePending(setupToken);
      throw new MfaError('MFA_SETUP_EXPIRED', 400);
    }
    if (!verifyTotp(setup.secret, code)) throw new MfaError('INVALID_MFA_CODE', 400);
    const recoveryCodes = Array.from({ length: 10 }, createRecoveryCode);
    await mfaRepository.enable(userId, setup.secret, recoveryCodes.map(hashRecoveryCode));
    await mfaRepository.deletePending(setupToken);
    return recoveryCodes;
  },

  async verify(userId: string, code: string) {
    const secret = await mfaRepository.getSecret(userId);
    return Boolean(secret && verifyTotp(secret, code));
  },

  async verifyRecoveryCode(userId: string, code: string) {
    const hash = hashRecoveryCode(code);
    return mfaRepository.consumeRecoveryCode(userId, hash);
  },

  async disable(userId: string, code: string) {
    if (!(await mfaRepository.isEnabled(userId))) throw new MfaError('MFA_NOT_ENABLED', 409);
    if (!(await mfaService.verify(userId, code))) throw new MfaError('INVALID_MFA_CODE', 400);
    await mfaRepository.disable(userId);
  },
};

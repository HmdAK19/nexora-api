import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

import { config } from '../config.js';
import type { SessionContext, SessionRecord, TokenClaims, UserRecord } from '../domain/index.js';
import { sessionRepository } from '../repositories/index.js';

const defaultContext: SessionContext = {
  browser: 'Unknown browser',
  device: 'Unknown device',
  ipAddress: 'Unknown',
  location: 'Unknown',
};
export const tokenService = {
  async createSession(user: UserRecord, context: SessionContext = defaultContext) {
    const jti = randomUUID();
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        type: 'access',
        jti,
      } satisfies TokenClaims,
      config.accessTokenSecret,
      {
        expiresIn: '15m',
      }
    );
    const refreshToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        type: 'refresh',
        jti,
      } satisfies TokenClaims,
      config.refreshTokenSecret,
      {
        expiresIn: '7d',
      }
    );
    const now = new Date().toISOString();
    await sessionRepository.create({
      ...context,
      createdAt: now,
      id: jti,
      lastActiveAt: now,
      userId: user.id,
      expiresAt: Date.now() + 7 * 86400000,
    });
    return {
      accessToken,
      refreshToken,
    };
  },
  async verifyAccess(token: string): Promise<TokenClaims> {
    const claims = jwt.verify(token, config.accessTokenSecret) as TokenClaims;
    if (claims.type !== 'access' || !claims.jti) throw new Error('INVALID_TOKEN_TYPE');
    const session = await sessionRepository.findById(claims.jti);
    if (!session || session.userId !== claims.sub || session.expiresAt <= Date.now()) {
      throw new Error('SESSION_REVOKED');
    }
    await sessionRepository.touch(claims.jti, new Date().toISOString());
    return claims;
  },
  async rotateRefresh(token: string) {
    const claims = jwt.verify(token, config.refreshTokenSecret) as TokenClaims;
    if (claims.type !== 'refresh' || !claims.jti) throw new Error('INVALID_REFRESH_TOKEN');
    const session = await sessionRepository.findById(claims.jti);
    if (!session || session.userId !== claims.sub || session.expiresAt <= Date.now()) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }
    await sessionRepository.delete(claims.jti);
    return { claims, context: session satisfies SessionContext };
  },
  async revoke(token: string) {
    try {
      const claims = jwt.verify(token, config.refreshTokenSecret) as TokenClaims;
      if (claims.jti) await sessionRepository.delete(claims.jti);
    } catch {
      /* An invalid cookie is already effectively revoked. */
    }
  },
  listSessions: (userId: string) => sessionRepository.listByUser(userId),
  async revokeSession(userId: string, sessionId: string, currentSessionId: string) {
    if (sessionId === currentSessionId) return 'current' as const;
    const session = await sessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) return 'not-found' as const;
    await sessionRepository.delete(sessionId);
    return 'revoked' as const;
  },
  revokeOtherSessions: (userId: string, currentSessionId: string) =>
    sessionRepository.deleteOthers(userId, currentSessionId),
};

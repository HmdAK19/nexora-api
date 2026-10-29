import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

import { config } from '../config.js';
import type { TokenClaims, UserRecord } from '../domain/index.js';

const activeRefreshTokens = new Map<
  string,
  {
    userId: string;
    expiresAt: number;
  }
>();
export const tokenService = {
  createSession(user: UserRecord) {
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        type: 'access',
      } satisfies TokenClaims,
      config.accessTokenSecret,
      {
        expiresIn: '15m',
      }
    );
    const jti = randomUUID();
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
    activeRefreshTokens.set(jti, {
      userId: user.id,
      expiresAt: Date.now() + 7 * 86400000,
    });
    return {
      accessToken,
      refreshToken,
    };
  },
  verifyAccess(token: string): TokenClaims {
    const claims = jwt.verify(token, config.accessTokenSecret) as TokenClaims;
    if (claims.type !== 'access') throw new Error('INVALID_TOKEN_TYPE');
    return claims;
  },
  rotateRefresh(token: string) {
    const claims = jwt.verify(token, config.refreshTokenSecret) as TokenClaims;
    if (claims.type !== 'refresh' || !claims.jti || !activeRefreshTokens.has(claims.jti))
      throw new Error('INVALID_REFRESH_TOKEN');
    activeRefreshTokens.delete(claims.jti);
    return claims;
  },
  revoke(token: string) {
    try {
      const claims = jwt.verify(token, config.refreshTokenSecret) as TokenClaims;
      if (claims.jti) activeRefreshTokens.delete(claims.jti);
    } catch {
      /* An invalid cookie is already effectively revoked. */
    }
  },
};

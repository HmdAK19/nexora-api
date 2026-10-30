import { Router, type Request } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { config } from '../../config.js';
import { getPermissionsForRole, type UserRecord } from '../../domain/index.js';
import { userRepository } from '../../repositories/index.js';
import { mfaService, tokenService } from '../../services/index.js';
import { requireAuth } from '../authMiddleware.js';

function getSessionContext(request: Request) {
  const userAgent = request.get('user-agent') ?? '';
  const browser = /edg\//i.test(userAgent)
    ? 'Edge'
    : /firefox\//i.test(userAgent)
      ? 'Firefox'
      : /chrome\//i.test(userAgent)
        ? 'Chrome'
        : /safari\//i.test(userAgent)
          ? 'Safari'
          : 'Unknown browser';
  const device = /android/i.test(userAgent)
    ? 'Android'
    : /iphone|ipad/i.test(userAgent)
      ? 'iOS'
      : /windows/i.test(userAgent)
        ? 'Windows'
        : /mac os/i.test(userAgent)
          ? 'macOS'
          : /linux/i.test(userAgent)
            ? 'Linux'
            : 'Unknown device';

  return { browser, device, ipAddress: request.ip || 'Unknown', location: 'Unknown' };
}

const loginSchema = z.object({
  email: z.string().email(),
  mfaCode: z.string().regex(/^\d{6}$/).optional(),
  recoveryCode: z.string().regex(/^[A-F0-9]{5}-[A-F0-9]{5}$/i).optional(),
  password: z.string().min(8).max(128),
});
const cookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: config.isProduction ? ('none' as const) : ('lax' as const),
  maxAge: 7 * 86400000,
  path: '/api/auth',
};
const publicUser = (user: UserRecord) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  level: user.level,
  permissions: getPermissionsForRole(user.role),
  role: user.role,
});
export const authRouter = Router();
authRouter.post('/login', async (request, response, next) => {
  try {
    const input = loginSchema.parse(request.body);
    const user = await userRepository.findByEmail(input.email);
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash)))
      return response.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect',
      });
    if (await mfaService.isEnabled(user.id)) {
      if (!input.mfaCode && !input.recoveryCode) {
        return response.status(401).json({ code: 'MFA_REQUIRED', message: 'Two-factor code is required' });
      }
      const verified = input.mfaCode
        ? await mfaService.verify(user.id, input.mfaCode)
        : await mfaService.verifyRecoveryCode(user.id, input.recoveryCode ?? '');
      if (!verified) {
        return response.status(401).json({ code: 'INVALID_MFA_CODE', message: 'Invalid two-factor code' });
      }
    }
    const session = await tokenService.createSession(user, getSessionContext(request));
    response.cookie('nexora_refresh', session.refreshToken, cookieOptions);
    return response.json({
      accessToken: session.accessToken,
      user: publicUser(user),
    });
  } catch (error) {
    return next(error);
  }
});
authRouter.post('/refresh', async (request, response) => {
  const refreshToken = request.cookies.nexora_refresh as string | undefined;
  if (!refreshToken)
    return response.status(401).json({
      code: 'NO_REFRESH_TOKEN',
      message: 'No active session',
    });
  try {
    const rotated = await tokenService.rotateRefresh(refreshToken);
    const user = await userRepository.findById(rotated.claims.sub);
    if (!user)
      return response.status(401).json({
        code: 'USER_NOT_FOUND',
        message: 'Account not found',
      });
    const session = await tokenService.createSession(user, rotated.context);
    response.cookie('nexora_refresh', session.refreshToken, cookieOptions);
    return response.json({
      accessToken: session.accessToken,
      user: publicUser(user),
    });
  } catch {
    response.clearCookie('nexora_refresh', {
      path: '/api/auth',
    });
    return response.status(401).json({
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Session expired',
    });
  }
});
authRouter.post('/logout', async (request, response) => {
  const token = request.cookies.nexora_refresh as string | undefined;
  if (token) await tokenService.revoke(token);
  response.clearCookie('nexora_refresh', {
    path: '/api/auth',
  });
  return response.status(204).send();
});
authRouter.get('/me', requireAuth, async (request, response) => {
  const user = await userRepository.findById(request.userId ?? '');
  if (!user)
    return response.status(404).json({
      code: 'USER_NOT_FOUND',
      message: 'Account not found',
    });
  return response.json(publicUser(user));
});

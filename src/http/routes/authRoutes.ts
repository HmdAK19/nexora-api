import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { config } from '../../config.js';
import { getPermissionsForRole } from '../../domain/index.js';
import { userRepository } from '../../repositories/index.js';
import { tokenService } from '../../services/index.js';
import { requireAuth } from '../authMiddleware.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
const cookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: config.isProduction ? ('none' as const) : ('lax' as const),
  maxAge: 7 * 86400000,
  path: '/api/auth',
};
const publicUser = (user: NonNullable<ReturnType<typeof userRepository.findById>>) => ({
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
    const user = userRepository.findByEmail(input.email);
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash)))
      return response.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect',
      });
    const session = tokenService.createSession(user);
    response.cookie('nexora_refresh', session.refreshToken, cookieOptions);
    return response.json({
      accessToken: session.accessToken,
      user: publicUser(user),
    });
  } catch (error) {
    return next(error);
  }
});
authRouter.post('/refresh', (request, response) => {
  const refreshToken = request.cookies.nexora_refresh as string | undefined;
  if (!refreshToken)
    return response.status(401).json({
      code: 'NO_REFRESH_TOKEN',
      message: 'No active session',
    });
  try {
    const claims = tokenService.rotateRefresh(refreshToken);
    const user = userRepository.findById(claims.sub);
    if (!user)
      return response.status(401).json({
        code: 'USER_NOT_FOUND',
        message: 'Account not found',
      });
    const session = tokenService.createSession(user);
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
authRouter.post('/logout', (request, response) => {
  const token = request.cookies.nexora_refresh as string | undefined;
  if (token) tokenService.revoke(token);
  response.clearCookie('nexora_refresh', {
    path: '/api/auth',
  });
  return response.status(204).send();
});
authRouter.get('/me', requireAuth, (request, response) => {
  const user = userRepository.findById(request.userId ?? '');
  if (!user)
    return response.status(404).json({
      code: 'USER_NOT_FOUND',
      message: 'Account not found',
    });
  return response.json(publicUser(user));
});

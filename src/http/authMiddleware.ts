import type { NextFunction, Request, Response } from 'express';

import { roleHasPermission, type Permission, type UserRole } from '../domain/index.js';
import { userRepository } from '../repositories/index.js';
import { tokenService } from '../services/index.js';

declare global {
  // Express exposes Request through a namespace specifically for declaration merging.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: {
        role: UserRole;
        sessionId: string;
        userId: string;
      };
      userId?: string;
    }
  }
}
export const requireAuth = async (request: Request, response: Response, next: NextFunction) => {
  if (request.auth) return next();

  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token)
    return response.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Authentication is required',
    });
  try {
    const claims = await tokenService.verifyAccess(token);
    const userId = claims.sub;
    const user = await userRepository.findById(userId);

    if (!user) {
      return response.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication is required',
      });
    }

    if (user.status === 'blocked') {
      return response.status(403).json({
        code: 'ACCOUNT_BLOCKED',
        message: 'Account access is blocked',
      });
    }

    request.auth = {
      role: user.role,
      sessionId: claims.jti ?? '',
      userId: user.id,
    };
    request.userId = user.id;

    return next();
  } catch {
    return response.status(401).json({
      code: 'TOKEN_EXPIRED',
      message: 'Session expired',
    });
  }
};

export const requirePermission =
  (permission: Permission) => (request: Request, response: Response, next: NextFunction) => {
    if (!request.auth) {
      return response.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication is required',
      });
    }

    if (!roleHasPermission(request.auth.role, permission)) {
      return response.status(403).json({
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action',
      });
    }

    return next();
  };

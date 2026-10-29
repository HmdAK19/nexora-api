import { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

import { PERMISSIONS } from '../../domain/index.js';
import { AdminError, adminService } from '../../services/index.js';
import { requirePermission } from '../authMiddleware.js';

const searchSchema = z.string().trim().max(120).catch('');
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
  pageSize: z.coerce.number().int().min(10).max(100).catch(25),
  search: searchSchema,
});
const userIdSchema = z.string().trim().min(1).max(100);
const ticketIdSchema = z.string().uuid();
const reviewSchema = z.object({ decision: z.enum(['approved', 'rejected']) });
const replySchema = z.object({ message: z.string().trim().min(10).max(4_000) });
const settingsSchema = z.object({
  minimumWithdrawal: z.number().min(0).max(1_000_000),
  networkEnabled: z.boolean(),
  paymentProvider: z.enum(['manual', 'provider-a']),
  tradingFeePercent: z.number().min(0).max(10),
  withdrawalsEnabled: z.boolean(),
});
const adminWriteLimit = rateLimit({
  legacyHeaders: false,
  limit: 60,
  message: { code: 'RATE_LIMITED', message: 'Too many administration requests' },
  standardHeaders: 'draft-8',
  windowMs: 60 * 60 * 1_000,
});

function handleAdminError(error: unknown, response: Response) {
  if (!(error instanceof AdminError)) return false;

  response.status(error.status).json({ code: error.code, message: error.code });
  return true;
}

export const adminRouter = Router();

adminRouter.get('/overview', requirePermission(PERMISSIONS.admin.overviewRead), (_request, response) =>
  response.json(adminService.getOverview())
);

adminRouter.get('/users', requirePermission(PERMISSIONS.admin.usersRead), (request, response) => {
  const { page, pageSize, search } = paginationSchema.parse(request.query);
  return response.json(adminService.listUsers(search, page, pageSize));
});

adminRouter.get(
  '/verifications',
  requirePermission(PERMISSIONS.admin.verificationRead),
  (_request, response) => response.json(adminService.listVerifications())
);

adminRouter.post(
  '/verifications/:userId/decision',
  requirePermission(PERMISSIONS.admin.verificationReview),
  adminWriteLimit,
  (request, response, next) => {
    try {
      const { decision } = reviewSchema.parse(request.body);
      return response.json(
        adminService.reviewVerification(
          request.userId ?? '',
          userIdSchema.parse(request.params.userId),
          decision
        )
      );
    } catch (error) {
      if (handleAdminError(error, response)) return;
      return next(error);
    }
  }
);

adminRouter.get('/tickets', requirePermission(PERMISSIONS.admin.supportRead), (_request, response) =>
  response.json(adminService.listTickets())
);

adminRouter.post(
  '/tickets/:ticketId/replies',
  requirePermission(PERMISSIONS.admin.supportReply),
  adminWriteLimit,
  (request, response, next) => {
    try {
      const { message } = replySchema.parse(request.body);
      return response
        .status(201)
        .json(
          adminService.replyToTicket(
            request.userId ?? '',
            ticketIdSchema.parse(request.params.ticketId),
            message
          )
        );
    } catch (error) {
      if (handleAdminError(error, response)) return;
      return next(error);
    }
  }
);

adminRouter.get('/settings', requirePermission(PERMISSIONS.admin.settingsRead), (_request, response) =>
  response.json(adminService.getSettings())
);

adminRouter.put(
  '/settings',
  requirePermission(PERMISSIONS.admin.settingsManage),
  adminWriteLimit,
  (request, response) =>
    response.json(adminService.updateSettings(request.userId ?? '', settingsSchema.parse(request.body)))
);

adminRouter.get('/audit-events', requirePermission(PERMISSIONS.admin.auditRead), (_request, response) =>
  response.json(adminService.listAuditEvents())
);

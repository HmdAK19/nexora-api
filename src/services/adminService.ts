import { randomUUID } from 'node:crypto';

import type { AdminSettingsRecord, SupportTicketRecord, UserRecord } from '../domain/index.js';
import {
  adminSettingsRepository,
  auditRepository,
  orderRepository,
  supportRepository,
  userRepository,
  verificationRepository,
  walletRepository,
} from '../repositories/index.js';

export class AdminError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}

function recordAudit(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, string | number | boolean>
) {
  return auditRepository.add({
    action,
    actorId,
    createdAt: new Date().toISOString(),
    id: randomUUID(),
    metadata,
    targetId,
    targetType,
  });
}

async function publicUser(user: UserRecord) {
  const balances = await walletRepository.listBalances(user.id);

  return {
    balance: (balances.USD ?? 0) + (balances.USDT ?? 0),
    email: user.email,
    id: user.id,
    level: user.level,
    name: user.name,
    role: user.role,
    status: user.status,
  };
}

async function requiredUser(userId: string) {
  const user = await userRepository.findById(userId);

  if (!user) throw new AdminError('USER_NOT_FOUND', 404);

  return user;
}

async function ticketSummary(ticket: SupportTicketRecord) {
  const messages = await supportRepository.listMessages(ticket.id);
  const lastMessage = messages.at(-1);

  return {
    category: ticket.category,
    createdAt: ticket.createdAt,
    id: ticket.id,
    lastMessagePreview: lastMessage?.body.slice(0, 140) ?? '',
    status: ticket.status,
    subject: ticket.subject,
    updatedAt: ticket.updatedAt,
    user: await publicUser(await requiredUser(ticket.userId)),
  };
}

export const adminService = {
  async getOverview() {
    const users = await userRepository.list();
    const orders = await orderRepository.list();
    const today = new Date().toISOString().slice(0, 10);
    const reviews = (await verificationRepository.list()).filter(({ status }) => status === 'pending');
    const tickets = (await supportRepository.listTickets()).filter(({ status }) => status === 'waiting_for_support');

    return {
      attention: {
        highRiskWithdrawals: 0,
        openVerifications: reviews.length,
        unansweredTickets: tickets.length,
      },
      metrics: {
        activeUsers: users.filter(({ status }) => status === 'active').length,
        openReviews: reviews.length,
        tradesToday: orders.filter(({ createdAt }) => createdAt.startsWith(today)).length,
        volume24h: orders
          .filter(({ createdAt }) => Date.now() - Date.parse(createdAt) <= 86_400_000)
          .reduce((total, order) => total + order.quoteAmount, 0),
      },
      services: [
        { key: 'trading', status: 'operational' },
        { key: 'wallet', status: 'operational' },
        { key: 'verification', status: 'operational' },
        { key: 'notifications', status: 'degraded' },
      ],
    };
  },

  async listUsers(search: string, page: number, pageSize: number) {
    const normalizedSearch = search.trim().toLowerCase();
    const users = (await userRepository
      .list())
      .filter((user) =>
        normalizedSearch
          ? `${user.id} ${user.name} ${user.email}`.toLowerCase().includes(normalizedSearch)
          : true
      );
    const offset = (page - 1) * pageSize;

    return {
      data: await Promise.all(users.slice(offset, offset + pageSize).map(publicUser)),
      hasMore: offset + pageSize < users.length,
      page,
      pageSize,
      total: users.length,
    };
  },

  async listVerifications() {
    return Promise.all((await verificationRepository
      .list())
      .filter(({ status }) => status === 'pending')
      .map(async (verification) => ({
        document: verification.document
          ? {
              mimeType: verification.document.mimeType,
              name: verification.document.name,
              uploadedAt: verification.document.uploadedAt,
            }
          : null,
        status: verification.status,
        submittedAt: verification.submittedAt ?? verification.updatedAt,
        user: await publicUser(await requiredUser(verification.userId)),
      })));
  },

  async reviewVerification(actorId: string, userId: string, decision: 'approved' | 'rejected') {
    const verification = await verificationRepository.findByUser(userId);

    if (!verification) throw new AdminError('VERIFICATION_NOT_FOUND', 404);
    if (verification.status !== 'pending') throw new AdminError('VERIFICATION_NOT_PENDING', 409);

    const status = decision === 'approved' ? 'verified' : 'rejected';
    const result = await verificationRepository.save({
      ...verification,
      status,
      updatedAt: new Date().toISOString(),
    });

    await recordAudit(actorId, `verification.${decision}`, 'verification', userId);

    return { status: result.status, userId };
  },

  async listTickets() {
    return Promise.all((await supportRepository.listTickets()).map(ticketSummary));
  },

  async replyToTicket(actorId: string, ticketId: string, body: string) {
    const ticket = await supportRepository.findTicketById(ticketId);

    if (!ticket) throw new AdminError('TICKET_NOT_FOUND', 404);
    if (ticket.status === 'closed') throw new AdminError('TICKET_CLOSED', 409);

    const createdAt = new Date().toISOString();
    await supportRepository.addMessage({
      author: 'support',
      body,
      createdAt,
      id: randomUUID(),
      ticketId,
    });
    await supportRepository.updateTicket(ticketId, { status: 'waiting_for_user', updatedAt: createdAt });
    await recordAudit(actorId, 'support.reply', 'support-ticket', ticketId);

    const updatedTicket = await supportRepository.findTicketById(ticketId);

    if (!updatedTicket) throw new AdminError('TICKET_NOT_FOUND', 404);

    return ticketSummary(updatedTicket);
  },

  getSettings: () => adminSettingsRepository.get(),

  async updateSettings(actorId: string, input: Omit<AdminSettingsRecord, 'updatedAt'>) {
    const result = await adminSettingsRepository.update({ ...input, updatedAt: new Date().toISOString() });
    await recordAudit(actorId, 'settings.update', 'admin-settings', 'global');
    return result;
  },

  listAuditEvents: () => auditRepository.list(),
};

import { randomUUID } from 'node:crypto';

import type { AdminSettingsRecord } from '../domain/index.js';
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

function publicUser(user: NonNullable<ReturnType<typeof userRepository.findById>>) {
  const balances = walletRepository.listBalances(user.id);

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

function requiredUser(userId: string) {
  const user = userRepository.findById(userId);

  if (!user) throw new AdminError('USER_NOT_FOUND', 404);

  return user;
}

function ticketSummary(ticket: NonNullable<ReturnType<typeof supportRepository.findTicketById>>) {
  const messages = supportRepository.listMessages(ticket.id);
  const lastMessage = messages.at(-1);

  return {
    category: ticket.category,
    createdAt: ticket.createdAt,
    id: ticket.id,
    lastMessagePreview: lastMessage?.body.slice(0, 140) ?? '',
    status: ticket.status,
    subject: ticket.subject,
    updatedAt: ticket.updatedAt,
    user: publicUser(requiredUser(ticket.userId)),
  };
}

export const adminService = {
  getOverview() {
    const users = userRepository.list();
    const orders = orderRepository.list();
    const today = new Date().toISOString().slice(0, 10);
    const reviews = verificationRepository.list().filter(({ status }) => status === 'pending');
    const tickets = supportRepository.listTickets().filter(({ status }) => status === 'waiting_for_support');

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

  listUsers(search: string, page: number, pageSize: number) {
    const normalizedSearch = search.trim().toLowerCase();
    const users = userRepository
      .list()
      .filter((user) =>
        normalizedSearch
          ? `${user.id} ${user.name} ${user.email}`.toLowerCase().includes(normalizedSearch)
          : true
      );
    const offset = (page - 1) * pageSize;

    return {
      data: users.slice(offset, offset + pageSize).map(publicUser),
      hasMore: offset + pageSize < users.length,
      page,
      pageSize,
      total: users.length,
    };
  },

  listVerifications() {
    return verificationRepository
      .list()
      .filter(({ status }) => status === 'pending')
      .map((verification) => ({
        document: verification.document
          ? {
              mimeType: verification.document.mimeType,
              name: verification.document.name,
              uploadedAt: verification.document.uploadedAt,
            }
          : null,
        status: verification.status,
        submittedAt: verification.submittedAt ?? verification.updatedAt,
        user: publicUser(requiredUser(verification.userId)),
      }));
  },

  reviewVerification(actorId: string, userId: string, decision: 'approved' | 'rejected') {
    const verification = verificationRepository.findByUser(userId);

    if (!verification) throw new AdminError('VERIFICATION_NOT_FOUND', 404);
    if (verification.status !== 'pending') throw new AdminError('VERIFICATION_NOT_PENDING', 409);

    const status = decision === 'approved' ? 'verified' : 'rejected';
    const result = verificationRepository.save({
      ...verification,
      status,
      updatedAt: new Date().toISOString(),
    });

    recordAudit(actorId, `verification.${decision}`, 'verification', userId);

    return { status: result.status, userId };
  },

  listTickets() {
    return supportRepository.listTickets().map(ticketSummary);
  },

  replyToTicket(actorId: string, ticketId: string, body: string) {
    const ticket = supportRepository.findTicketById(ticketId);

    if (!ticket) throw new AdminError('TICKET_NOT_FOUND', 404);
    if (ticket.status === 'closed') throw new AdminError('TICKET_CLOSED', 409);

    const createdAt = new Date().toISOString();
    supportRepository.addMessage({
      author: 'support',
      body,
      createdAt,
      id: randomUUID(),
      ticketId,
    });
    supportRepository.updateTicket(ticketId, { status: 'waiting_for_user', updatedAt: createdAt });
    recordAudit(actorId, 'support.reply', 'support-ticket', ticketId);

    const updatedTicket = supportRepository.findTicketById(ticketId);

    if (!updatedTicket) throw new AdminError('TICKET_NOT_FOUND', 404);

    return ticketSummary(updatedTicket);
  },

  getSettings: () => adminSettingsRepository.get(),

  updateSettings(actorId: string, input: Omit<AdminSettingsRecord, 'updatedAt'>) {
    const result = adminSettingsRepository.update({ ...input, updatedAt: new Date().toISOString() });
    recordAudit(actorId, 'settings.update', 'admin-settings', 'global');
    return result;
  },

  listAuditEvents: () => auditRepository.list(),
};

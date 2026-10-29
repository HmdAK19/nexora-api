import { randomUUID } from 'node:crypto';

import type { SupportCategory, SupportTicketRecord } from '../domain/index.js';
import { supportRepository } from '../repositories/index.js';

export class SupportError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}

function messagesFor(ticketId: string) {
  return supportRepository.listMessages(ticketId).map(({ ticketId: _ticketId, ...message }) => {
    void _ticketId;
    return message;
  });
}

function summary(ticket: SupportTicketRecord) {
  const messages = messagesFor(ticket.id);
  const lastMessage = messages.at(-1);
  const { userId: _userId, ...publicTicket } = ticket;
  void _userId;

  return {
    ...publicTicket,
    lastMessagePreview: lastMessage?.body.slice(0, 160) ?? ticket.subject,
  };
}

function details(ticket: SupportTicketRecord) {
  return { ...summary(ticket), messages: messagesFor(ticket.id) };
}

function ownedTicket(userId: string, ticketId: string) {
  const ticket = supportRepository.findTicketById(ticketId);

  if (!ticket || ticket.userId !== userId) throw new SupportError('TICKET_NOT_FOUND', 404);

  return ticket;
}

export const supportService = {
  listTickets: (userId: string) => supportRepository.listTicketsByUser(userId).map(summary),

  getTicket: (userId: string, ticketId: string) => details(ownedTicket(userId, ticketId)),

  createTicket(userId: string, subject: string, category: SupportCategory, body: string) {
    const now = new Date().toISOString();
    const ticketId = randomUUID();
    const ticket = supportRepository.createTicket(
      {
        category,
        createdAt: now,
        id: ticketId,
        status: 'waiting_for_support',
        subject,
        updatedAt: now,
        userId,
      },
      {
        author: 'user',
        body,
        createdAt: now,
        id: randomUUID(),
        ticketId,
      }
    );

    return details(ticket);
  },

  reply(userId: string, ticketId: string, body: string) {
    const ticket = ownedTicket(userId, ticketId);

    if (ticket.status === 'closed') throw new SupportError('TICKET_CLOSED', 409);

    const now = new Date().toISOString();
    supportRepository.addMessage({
      author: 'user',
      body,
      createdAt: now,
      id: randomUUID(),
      ticketId,
    });
    supportRepository.updateTicket(ticketId, { status: 'waiting_for_support', updatedAt: now });

    return details(ticket);
  },

  closeTicket(userId: string, ticketId: string) {
    const ticket = ownedTicket(userId, ticketId);

    if (ticket.status !== 'closed') {
      supportRepository.updateTicket(ticketId, {
        status: 'closed',
        updatedAt: new Date().toISOString(),
      });
    }

    return details(ticket);
  },
};

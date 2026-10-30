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

async function messagesFor(ticketId: string) {
  return (await supportRepository.listMessages(ticketId)).map(({ ticketId: _ticketId, ...message }) => {
    void _ticketId;
    return message;
  });
}

async function summary(ticket: SupportTicketRecord) {
  const messages = await messagesFor(ticket.id);
  const lastMessage = messages.at(-1);
  const { userId: _userId, ...publicTicket } = ticket;
  void _userId;

  return {
    ...publicTicket,
    lastMessagePreview: lastMessage?.body.slice(0, 160) ?? ticket.subject,
  };
}

async function details(ticket: SupportTicketRecord) {
  return { ...(await summary(ticket)), messages: await messagesFor(ticket.id) };
}

async function ownedTicket(userId: string, ticketId: string) {
  const ticket = await supportRepository.findTicketById(ticketId);

  if (!ticket || ticket.userId !== userId) throw new SupportError('TICKET_NOT_FOUND', 404);

  return ticket;
}

export const supportService = {
  listTickets: async (userId: string) =>
    Promise.all((await supportRepository.listTicketsByUser(userId)).map(summary)),

  getTicket: async (userId: string, ticketId: string) => details(await ownedTicket(userId, ticketId)),

  async createTicket(userId: string, subject: string, category: SupportCategory, body: string) {
    const now = new Date().toISOString();
    const ticketId = randomUUID();
    const ticket = await supportRepository.createTicket(
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

  async reply(userId: string, ticketId: string, body: string) {
    const ticket = await ownedTicket(userId, ticketId);

    if (ticket.status === 'closed') throw new SupportError('TICKET_CLOSED', 409);

    const now = new Date().toISOString();
    await supportRepository.addMessage({
      author: 'user',
      body,
      createdAt: now,
      id: randomUUID(),
      ticketId,
    });
    await supportRepository.updateTicket(ticketId, { status: 'waiting_for_support', updatedAt: now });

    return details(ticket);
  },

  async closeTicket(userId: string, ticketId: string) {
    const ticket = await ownedTicket(userId, ticketId);

    if (ticket.status !== 'closed') {
      await supportRepository.updateTicket(ticketId, {
        status: 'closed',
        updatedAt: new Date().toISOString(),
      });
    }

    return details(ticket);
  },
};

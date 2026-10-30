import { createHash, randomUUID } from 'node:crypto';

import type { BankCardRecord } from '../domain/index.js';
import { bankCardRepository } from '../repositories/index.js';

export class BankCardError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}
const publicCard = ({
  userId: _userId,
  fingerprint: _fingerprint,
  ...card
}: BankCardRecord) => {
  void _userId;
  void _fingerprint;
  return card;
};
const maskNumber = (number: string) => `${number.slice(0, 4)} •••• •••• ${number.slice(-4)}`;
const maskIban = (iban: string) => `${iban.slice(0, 4)} •••• •••• •••• •••• ••${iban.slice(-4)}`;

export const bankCardService = {
  list: async (userId: string) => (await bankCardRepository.listByUser(userId)).map(publicCard),
  async create(userId: string, number: string, iban: string) {
    const fingerprint = createHash('sha256').update(`${userId}:${number}:${iban}`).digest('hex');
    if (await bankCardRepository.findByFingerprint(userId, fingerprint))
      throw new BankCardError('CARD_ALREADY_EXISTS', 409);
    const first = (await bankCardRepository.listByUser(userId)).length === 0;
    return publicCard(
      await bankCardRepository.create({
        createdAt: new Date().toISOString(),
        fingerprint,
        id: randomUUID(),
        isDefault: first,
        maskedIban: maskIban(iban),
        maskedNumber: maskNumber(number),
        userId,
      })
    );
  },
  async delete(userId: string, id: string) {
    const removed = await bankCardRepository.delete(userId, id);
    if (!removed) throw new BankCardError('CARD_NOT_FOUND', 404);
    if (removed.isDefault) {
      const next = (await bankCardRepository.listByUser(userId))[0];
      if (next) await bankCardRepository.setDefault(userId, next.id);
    }
  },
  async setDefault(userId: string, id: string) {
    if (!(await bankCardRepository.findById(userId, id))) throw new BankCardError('CARD_NOT_FOUND', 404);
    const card = await bankCardRepository.setDefault(userId, id);
    if (!card) throw new BankCardError('CARD_NOT_FOUND', 404);
    return publicCard(card);
  },
};

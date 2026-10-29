import { createHash, randomUUID } from 'node:crypto';

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
}: ReturnType<typeof bankCardRepository.create>) => {
  void _userId;
  void _fingerprint;
  return card;
};
const maskNumber = (number: string) => `${number.slice(0, 4)} •••• •••• ${number.slice(-4)}`;
const maskIban = (iban: string) => `${iban.slice(0, 4)} •••• •••• •••• •••• ••${iban.slice(-4)}`;

export const bankCardService = {
  list: (userId: string) => bankCardRepository.listByUser(userId).map(publicCard),
  create(userId: string, number: string, iban: string) {
    const fingerprint = createHash('sha256').update(`${userId}:${number}:${iban}`).digest('hex');
    if (bankCardRepository.findByFingerprint(userId, fingerprint))
      throw new BankCardError('CARD_ALREADY_EXISTS', 409);
    const first = bankCardRepository.listByUser(userId).length === 0;
    return publicCard(
      bankCardRepository.create({
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
  delete(userId: string, id: string) {
    const removed = bankCardRepository.delete(userId, id);
    if (!removed) throw new BankCardError('CARD_NOT_FOUND', 404);
    if (removed.isDefault) {
      const next = bankCardRepository.listByUser(userId)[0];
      if (next) bankCardRepository.setDefault(userId, next.id);
    }
  },
  setDefault(userId: string, id: string) {
    if (!bankCardRepository.findById(userId, id)) throw new BankCardError('CARD_NOT_FOUND', 404);
    const card = bankCardRepository.setDefault(userId, id);
    if (!card) throw new BankCardError('CARD_NOT_FOUND', 404);
    return publicCard(card);
  },
};

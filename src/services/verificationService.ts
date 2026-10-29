import { randomUUID } from 'node:crypto';

import type { VerificationRecord } from '../domain/index.js';
import { verificationRepository } from '../repositories/index.js';

export class VerificationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}

function current(userId: string): VerificationRecord {
  return (
    verificationRepository.findByUser(userId) ?? {
      status: 'not_started',
      updatedAt: new Date(0).toISOString(),
      userId,
    }
  );
}

function publicRecord(record: VerificationRecord) {
  const { userId: _userId, nationalId, ...result } = record;
  void _userId;
  return {
    ...result,
    nationalIdMasked: nationalId
      ? `${'*'.repeat(Math.max(0, nationalId.length - 4))}${nationalId.slice(-4)}`
      : undefined,
  };
}

export const verificationService = {
  get: (userId: string) => publicRecord(current(userId)),
  saveProfile(
    userId: string,
    profile: { country: 'AE' | 'IR' | 'TR'; fullName: string; nationalId: string }
  ) {
    const existing = current(userId);
    if (existing.status === 'pending' || existing.status === 'verified')
      throw new VerificationError('VERIFICATION_LOCKED', 409);
    return publicRecord(
      verificationRepository.save({
        ...existing,
        ...profile,
        status: existing.document ? 'ready' : 'draft',
        updatedAt: new Date().toISOString(),
        userId,
      })
    );
  },
  saveDocument(userId: string, document: { mimeType: string; name: string; size: number }) {
    const existing = current(userId);
    if (existing.status === 'pending' || existing.status === 'verified')
      throw new VerificationError('VERIFICATION_LOCKED', 409);
    const uploadedAt = new Date().toISOString();
    return publicRecord(
      verificationRepository.save({
        ...existing,
        document: { ...document, id: randomUUID(), uploadedAt },
        status: existing.fullName && existing.nationalId && existing.country ? 'ready' : 'draft',
        updatedAt: uploadedAt,
        userId,
      })
    );
  },
  submit(userId: string) {
    const existing = current(userId);
    if (!existing.fullName || !existing.nationalId || !existing.country || !existing.document)
      throw new VerificationError('VERIFICATION_INCOMPLETE', 409);
    if (existing.status === 'verified') return publicRecord(existing);
    if (existing.status === 'pending') return publicRecord(existing);
    const submittedAt = new Date().toISOString();
    return publicRecord(
      verificationRepository.save({
        ...existing,
        status: 'pending',
        submittedAt,
        updatedAt: submittedAt,
        userId,
      })
    );
  },
};

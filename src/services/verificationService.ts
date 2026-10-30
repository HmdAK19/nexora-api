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

async function current(userId: string): Promise<VerificationRecord> {
  return (
    (await verificationRepository.findByUser(userId)) ?? {
      status: 'not_started',
      updatedAt: new Date(0).toISOString(),
      userId,
    }
  );
}

function publicRecord(record: VerificationRecord) {
  const { userId: _userId, nationalId, documentData: _documentData, ...result } = record;
  void _userId;
  void _documentData;
  return {
    ...result,
    nationalIdMasked: nationalId
      ? `${'*'.repeat(Math.max(0, nationalId.length - 4))}${nationalId.slice(-4)}`
      : undefined,
  };
}

export const verificationService = {
  get: async (userId: string) => publicRecord(await current(userId)),
  async saveProfile(
    userId: string,
    profile: { country: 'AE' | 'IR' | 'TR'; fullName: string; nationalId: string }
  ) {
    const existing = await current(userId);
    if (existing.status === 'pending' || existing.status === 'verified')
      throw new VerificationError('VERIFICATION_LOCKED', 409);
    return publicRecord(
      await verificationRepository.save({
        ...existing,
        ...profile,
        status: existing.document ? 'ready' : 'draft',
        updatedAt: new Date().toISOString(),
        userId,
      })
    );
  },
  async saveDocument(
    userId: string,
    document: { data: Buffer; mimeType: string; name: string; size: number }
  ) {
    const existing = await current(userId);
    if (existing.status === 'pending' || existing.status === 'verified')
      throw new VerificationError('VERIFICATION_LOCKED', 409);
    const uploadedAt = new Date().toISOString();
    return publicRecord(
      await verificationRepository.save({
        ...existing,
        document: {
          id: randomUUID(),
          mimeType: document.mimeType,
          name: document.name,
          size: document.size,
          uploadedAt,
        },
        documentData: document.data,
        status: existing.fullName && existing.nationalId && existing.country ? 'ready' : 'draft',
        updatedAt: uploadedAt,
        userId,
      })
    );
  },
  async submit(userId: string) {
    const existing = await current(userId);
    if (!existing.fullName || !existing.nationalId || !existing.country || !existing.document)
      throw new VerificationError('VERIFICATION_INCOMPLETE', 409);
    if (existing.status === 'verified') return publicRecord(existing);
    if (existing.status === 'pending') return publicRecord(existing);
    const submittedAt = new Date().toISOString();
    return publicRecord(
      await verificationRepository.save({
        ...existing,
        status: 'pending',
        submittedAt,
        updatedAt: submittedAt,
        userId,
      })
    );
  },
};

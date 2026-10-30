import { randomUUID } from 'node:crypto';

import bcrypt from 'bcryptjs';

import type { UserRecord } from '../domain/index.js';
import { userRepository } from '../repositories/index.js';

export interface RegistrationInput {
  email: string;
  language: 'en' | 'fa';
  name: string;
  password: string;
  phone?: string;
  termsAccepted: true;
}

export class RegistrationError extends Error {
  constructor(
    public readonly code: 'EMAIL_ALREADY_EXISTS',
    public readonly status: number
  ) {
    super(code);
  }
}

export const registrationService = {
  register: async (input: RegistrationInput): Promise<UserRecord> => {
    const email = input.email.trim().toLowerCase();
    const existing = await userRepository.findByEmail(email);
    if (existing) throw new RegistrationError('EMAIL_ALREADY_EXISTS', 409);

    const now = new Date().toISOString();
    const user = await userRepository.create({
      language: input.language,
      phone: input.phone?.trim() ?? '',
      termsAcceptedAt: now,
      user: {
        email,
        id: randomUUID(),
        level: 'basic',
        name: input.name.trim().replace(/\s+/g, ' '),
        passwordChangedAt: now,
        passwordHash: await bcrypt.hash(input.password, 12),
        role: 'customer',
        status: 'active',
      },
    });

    if (!user) throw new RegistrationError('EMAIL_ALREADY_EXISTS', 409);
    return user;
  },
};

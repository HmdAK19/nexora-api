import * as memory from './inMemoryRepository.js';
import { prismaRepositories } from './prismaRepository.js';

type Repository = Record<string, (...args: never[]) => unknown>;
type AsyncRepository<T extends Repository> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<Awaited<R>> : never;
};

const useMemory = process.env.NODE_ENV === 'test' || process.env.PERSISTENCE_DRIVER === 'memory';
function select<T extends Repository>(memoryRepository: T, prismaRepository: unknown): AsyncRepository<T> {
  const target = (useMemory ? memoryRepository : prismaRepository) as Repository;
  return new Proxy({} as AsyncRepository<T>, {
    get: (_object, property: string) => (...args: unknown[]) =>
      Promise.resolve((target[property] as (...values: unknown[]) => unknown)(...args)),
  });
}

export const accountPreferencesRepository = select(
  memory.accountPreferencesRepository,
  prismaRepositories.accountPreferencesRepository
);
export const accountProfileRepository = select(
  memory.accountProfileRepository,
  prismaRepositories.accountProfileRepository
);
export const adminSettingsRepository = select(
  memory.adminSettingsRepository,
  prismaRepositories.adminSettingsRepository
);
export const auditRepository = select(memory.auditRepository, prismaRepositories.auditRepository);
export const bankCardRepository = select(memory.bankCardRepository, prismaRepositories.bankCardRepository);
export const conversionRepository = select(memory.conversionRepository, prismaRepositories.conversionRepository);
export const mfaRepository = select(memory.mfaRepository, prismaRepositories.mfaRepository);
export const notificationRepository = select(
  memory.notificationRepository,
  prismaRepositories.notificationRepository
);
export const orderRepository = select(memory.orderRepository, prismaRepositories.orderRepository);
export const purchaseRepository = select(memory.purchaseRepository, prismaRepositories.purchaseRepository);
export const referralRepository = select(memory.referralRepository, prismaRepositories.referralRepository);
export const sessionRepository = select(memory.sessionRepository, prismaRepositories.sessionRepository);
export const supportRepository = select(memory.supportRepository, prismaRepositories.supportRepository);
export const userRepository = select(memory.userRepository, prismaRepositories.userRepository);
export const verificationRepository = select(
  memory.verificationRepository,
  prismaRepositories.verificationRepository
);
export const walletRepository = select(memory.walletRepository, prismaRepositories.walletRepository);

export { prisma } from '../persistence/prismaClient.js';

import { notificationRepository, userRepository } from '../repositories/index.js';

export class NotificationError extends Error {
  constructor(
    readonly code: 'NOTIFICATION_NOT_FOUND' | 'USER_NOT_FOUND',
    readonly status: number
  ) {
    super(code);
  }
}

const toResponse = async (userId: string) => {
  const items = (await notificationRepository.listByUser(userId)).map(({ userId: _userId, ...notification }) =>
    notification
  );
  return {
    items,
    unreadCount: items.filter((notification) => !notification.readAt).length,
  };
};

export const notificationService = {
  async list(userId: string) {
    if (!(await userRepository.findById(userId))) throw new NotificationError('USER_NOT_FOUND', 404);
    return toResponse(userId);
  },

  async markAllRead(userId: string) {
    if (!(await userRepository.findById(userId))) throw new NotificationError('USER_NOT_FOUND', 404);
    await notificationRepository.markAllRead(userId, new Date().toISOString());
    return toResponse(userId);
  },

  async markRead(userId: string, notificationId: string) {
    if (!(await notificationRepository.markRead(userId, notificationId, new Date().toISOString()))) {
      throw new NotificationError('NOTIFICATION_NOT_FOUND', 404);
    }
    return toResponse(userId);
  },
};

import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const prisma = {
    notification: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(prisma as never);
  });

  it('marks only the signed-in person’s notification as read', async () => {
    prisma.notification.findUnique.mockResolvedValue({
      id: 'notification-1',
      userId: 'user-1',
    });
    prisma.notification.update.mockResolvedValue({ id: 'notification-1' });

    await expect(service.markRead('user-1', 'notification-1')).resolves.toEqual({
      id: 'notification-1',
    });
    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'notification-1' } }),
    );
  });

  it('lists notifications only for the signed-in person', async () => {
    prisma.notification.findMany.mockResolvedValue([]);

    await service.listForUser('user-1', true, 5);

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  });

  it('does not reveal or change another person’s notification', async () => {
    prisma.notification.findUnique.mockResolvedValue({
      id: 'notification-1',
      userId: 'user-2',
    });

    await expect(service.markRead('user-1', 'notification-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('marks all unread notifications only for the signed-in person', async () => {
    await service.markAllRead('user-1');

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });
});

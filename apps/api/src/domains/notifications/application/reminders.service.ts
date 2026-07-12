import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ReminderItem } from '@complianx/contracts/ai-systems';
import { PrismaService } from '../../../platform/database/prisma.service';
import { CreateReminderDto } from '../presentation/dto/create-reminder.dto';
import { UpdateReminderDto } from '../presentation/dto/update-reminder.dto';
import { ProjectsService } from '../../ai-systems/application/projects/projects.service';

@Injectable()
export class RemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  async list(projectId: string, userId: string): Promise<ReminderItem[]> {
    const project = await this.projectsService.assertOwnership(
      projectId,
      userId,
    );
    return this.prisma.reminder.findMany({
      where: { projectId: project.id },
      orderBy: { dueAt: 'asc' },
    }).then((reminders) =>
      reminders.map((reminder) => ({
        id: reminder.id,
        message: reminder.message,
        dueAt: reminder.dueAt.toISOString(),
        completed: reminder.completed,
      })),
    );
  }

  async create(
    projectId: string,
    userId: string,
    dto: CreateReminderDto,
  ): Promise<ReminderItem> {
    await this.projectsService.assertOwnership(projectId, userId);
    return this.prisma.reminder.create({
      data: {
        message: dto.message,
        dueAt: new Date(dto.dueAt),
        projectId,
        ownerId: userId,
      },
    }).then((reminder) => ({
      id: reminder.id,
      message: reminder.message,
      dueAt: reminder.dueAt.toISOString(),
      completed: reminder.completed,
    }));
  }

  async update(
    projectId: string,
    reminderId: string,
    userId: string,
    dto: UpdateReminderDto,
  ): Promise<ReminderItem> {
    await this.projectsService.assertOwnership(projectId, userId);
    const reminder = await this.prisma.reminder.findUnique({
      where: { id: reminderId },
    });
    if (!reminder || reminder.projectId !== projectId) {
      throw new NotFoundException('Reminder not found');
    }
    if (reminder.ownerId !== userId) {
      throw new ForbiddenException();
    }
    return this.prisma.reminder.update({
      where: { id: reminderId },
      data: {
        message: dto.message ?? reminder.message,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : reminder.dueAt,
        completed:
          dto.completed !== undefined ? dto.completed : reminder.completed,
      },
    }).then((updatedReminder) => ({
      id: updatedReminder.id,
      message: updatedReminder.message,
      dueAt: updatedReminder.dueAt.toISOString(),
      completed: updatedReminder.completed,
    }));
  }
}

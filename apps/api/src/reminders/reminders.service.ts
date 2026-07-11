import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class RemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  async list(projectId: string, userId: string) {
    const project = await this.projectsService.assertOwnership(
      projectId,
      userId,
    );
    return this.prisma.reminder.findMany({
      where: { projectId: project.id },
      orderBy: { dueAt: 'asc' },
    });
  }

  async create(projectId: string, userId: string, dto: CreateReminderDto) {
    await this.projectsService.assertOwnership(projectId, userId);
    return this.prisma.reminder.create({
      data: {
        message: dto.message,
        dueAt: new Date(dto.dueAt),
        projectId,
        ownerId: userId,
      },
    });
  }

  async update(
    projectId: string,
    reminderId: string,
    userId: string,
    dto: UpdateReminderDto,
  ) {
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
    });
  }
}

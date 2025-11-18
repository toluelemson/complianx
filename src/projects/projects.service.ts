import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { Prisma, Project } from '@prisma/client';
import { EmailService } from '../notifications/email.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notifications: NotificationsService,
  ) {}

  listForUser(userId: string) {
    return this.prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        sections: {
          select: { id: true, name: true, updatedAt: true },
        },
        documents: {
          select: { id: true, type: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async createForUser(userId: string, dto: CreateProjectDto) {
    const owner = (await this.prisma.user.findUnique({
      where: { id: userId },
    })) as any;
    if (!owner?.companyId) {
      throw new ForbiddenException(
        'Join or create a company before creating projects',
      );
    }
    return (this.prisma as any).project.create({
      data: ({
        ...dto,
        ownerId: userId,
        companyId: owner.companyId,
      } as any),
    });
  }

  async getOwnedProject(projectId: string, userId: string) {
    const project = await (this.prisma as any).project.findUnique({
      where: { id: projectId },
      include: {
        reviewer: { select: { id: true, email: true, role: true } },
        approver: { select: { id: true, email: true, role: true } },
        sections: {
          include: {
            lastEditor: { select: { id: true, email: true } },
            comments: {
              include: { author: { select: { id: true, email: true } } },
              orderBy: { createdAt: 'asc' },
            },
            statusEvents: {
              include: { actor: { select: { id: true, email: true } } },
              orderBy: { createdAt: 'desc' },
            },
            artifacts: ({
              include: {
                uploadedBy: { select: { id: true, email: true } },
                reviewedBy: { select: { id: true, email: true } },
                previousArtifact: {
                  select: {
                    id: true,
                    version: true,
                    checksum: true,
                    citationKey: true,
                  },
                },
              },
              orderBy: { version: 'desc' },
            } as any),
          },
        },
        documents: true,
        statusEvents: {
          include: { actor: { select: { id: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.ownerId !== userId) {
      throw new ForbiddenException();
    }
    return project;
  }

  async assertOwnership(projectId: string, userId: string): Promise<Project> {
    const project = await (this.prisma as any).project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.ownerId !== userId) {
      throw new ForbiddenException();
    }
    return project;
  }

  async cloneProject(projectId: string, userId: string, name?: string) {
    const source = await (this.prisma as any).project.findUnique({
      where: { id: projectId },
      include: { sections: true },
    });
    if (!source) {
      throw new NotFoundException('Project not found');
    }
    if (source.ownerId !== userId) {
      throw new ForbiddenException();
    }
    const cloneName = name?.trim() || `${source.name} Copy`;
    const newProject = await this.prisma.$transaction(async (tx) => {
      const created = await (tx as any).project.create({
        data: {
          name: cloneName,
          industry: source.industry,
          riskLevel: source.riskLevel,
          ownerId: userId,
        },
      });
      if (source.sections.length) {
        await (tx as any).section.createMany({
          data: source.sections.map((section) => ({
            name: section.name,
            content: section.content as Prisma.InputJsonValue,
            projectId: created.id,
          })),
        });
      }
      return created;
    });
    return this.getOwnedProject(newProject.id, userId);
  }

  async updateStatus(
    projectId: string,
    userId: string,
    status: string,
    note?: string,
    signature?: string,
  ) {
    const actor = (await this.prisma.user.findUnique({
      where: { id: userId },
    })) as any;
    if (!actor) {
      throw new NotFoundException('User not found');
    }
    await this.assertOwnership(projectId, userId);
    if (
      status === 'APPROVED' &&
      actor.role !== 'REVIEWER'
    ) {
      throw new ForbiddenException('Only reviewers can approve projects');
    }
    if (status === 'APPROVED' && !signature?.trim()) {
      throw new BadRequestException('Signature is required to approve');
    }
    await this.prisma.$transaction(async (tx) => {
      await (tx as any).project.update({
        where: { id: projectId },
        data: { status: status as any },
      });
      await (tx as any).projectStatusEvent.create({
        data: ({
          projectId,
          status: status as any,
          note,
          signature: signature?.trim(),
          actorId: userId,
        } as any),
      });
    });
    return this.getOwnedProject(projectId, userId);
  }

  async listReviewers(projectId: string, userId: string) {
    const project = (await this.assertOwnership(projectId, userId)) as any;
    if (!project.companyId) {
      throw new NotFoundException('Project company not set');
    }
    const reviewers = await (this.prisma as any).user.findMany({
      where: {
        companyId: project.companyId,
        OR: [{ role: 'REVIEWER' }, { role: 'ADMIN' }] as any,
      },
      select: { id: true, email: true, role: true, companyId: true } as any,
      orderBy: { email: 'asc' },
    });
    if (!reviewers.length) {
      const self = (await (this.prisma as any).user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, companyId: true },
      })) as any;
      if (self && self.companyId === project.companyId) {
        return [{ id: self.id, email: self.email, role: self.role }];
      }
    }
    return reviewers.map((u: any) => ({ id: u.id, email: u.email, role: u.role }));
  }

  async requestReview(
    projectId: string,
    userId: string,
    reviewerId: string,
    message?: string,
    approverId?: string,
  ) {
    const project = (await this.assertOwnership(projectId, userId)) as any;
    const reviewer = (await this.prisma.user.findUnique({ where: { id: reviewerId } })) as any;
    if (!reviewer) {
      throw new NotFoundException('Reviewer not found');
    }
    if (reviewer.role !== 'REVIEWER' && reviewer.role !== 'ADMIN') {
      throw new ForbiddenException('Target user is not a reviewer');
    }
    if (project.companyId && reviewer.companyId && project.companyId !== reviewer.companyId) {
      throw new ForbiddenException('Reviewer belongs to another company');
    }

    let approver: { id: string; email: string } | null = null;
    if (approverId) {
      const ap = (await this.prisma.user.findUnique({ where: { id: approverId } })) as any;
      if (!ap) {
        throw new NotFoundException('Approver not found');
      }
      if (ap.role !== 'REVIEWER' && ap.role !== 'ADMIN') {
        throw new ForbiddenException('Target approver is not a reviewer');
      }
      if (project.companyId && ap.companyId && project.companyId !== ap.companyId) {
        throw new ForbiddenException('Approver belongs to another company');
      }
      approver = { id: ap.id, email: ap.email };
    }

    const link = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/projects/${projectId}`;
    const subject = `Review request: ${project.name}`;
    const body = [
      `You have been requested to review the project "${project.name}".`,
      message?.trim() ? `\nMessage: ${message.trim()}` : '',
      `\nOpen project: ${link}`,
    ]
      .filter(Boolean)
      .join('\n');
    await this.emailService.sendReminder(reviewer.email, subject, body);
    await this.notifications.create({
      userId: reviewer.id,
      title: `Review requested: ${project.name}`,
      body: message?.trim() || 'A project requires your review.',
      type: 'review',
      meta: { projectId },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: ({
          status: 'IN_REVIEW',
          reviewerId: reviewer.id,
          approverId: approver?.id ?? undefined,
        } as any),
      });
      await tx.projectStatusEvent.create({
        data: {
          projectId,
          status: 'IN_REVIEW',
          note: `Requested review from ${reviewer.email}${approver ? `; approver ${approver.email}` : ''}${message?.trim() ? ` — ${message.trim()}` : ''}`,
          actorId: userId,
        },
      });
    });
    if (approver) {
      const asub = `FYI: ${project.name} sent for review`;
      const abody = [`You were set as approver for "${project.name}".`, `\nLink: ${link}`]
        .filter(Boolean)
        .join('\n');
      await this.emailService.sendReminder(approver.email, asub, abody);
      await this.notifications.create({
        userId: approver.id,
        title: `Approver set: ${project.name}`,
        body: 'You were added as approver and will be notified when ready.',
        type: 'approval',
        meta: { projectId },
      });
    }
    return { ok: true };
  }
}

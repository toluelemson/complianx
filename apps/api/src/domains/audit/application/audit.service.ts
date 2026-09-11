import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service';

type AuditClient = PrismaService | Prisma.TransactionClient | PrismaClient;

export type AuditRecord = {
  companyId: string;
  projectId?: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  beforeSnapshot?: Prisma.InputJsonValue;
  afterSnapshot?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(event: AuditRecord, client: AuditClient = this.prisma) {
    const createdAt = new Date();
    return client.auditEvent.create({
      data: {
        companyId: event.companyId,
        projectId: event.projectId,
        actorId: event.actorId,
        entityType: event.entityType,
        entityId: event.entityId,
        action: event.action,
        beforeSnapshot: event.beforeSnapshot,
        afterSnapshot: event.afterSnapshot,
        metadata: event.metadata,
        correlationId:
          event.metadata && typeof event.metadata === 'object'
            ? typeof (event.metadata as Record<string, unknown>)
                .correlationId === 'string'
              ? (event.metadata as Record<string, string>).correlationId
              : undefined
            : undefined,
        packVersion:
          event.metadata && typeof event.metadata === 'object'
            ? typeof (event.metadata as Record<string, unknown>).packVersion ===
              'string'
              ? (event.metadata as Record<string, string>).packVersion
              : undefined
            : undefined,
        createdAt,
      },
    });
  }

  async listProjectEvents(projectId: string, companyId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, companyId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.auditEvent.findMany({
      where: { projectId, companyId },
      include: { actor: { select: { id: true, email: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }
}

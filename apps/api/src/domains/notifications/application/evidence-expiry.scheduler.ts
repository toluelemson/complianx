import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service';
import { AuditService } from '../../audit/application/audit.service';
import { NotificationsService } from './notifications.service';

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class EvidenceExpiryScheduler implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit() {
    const configured = Number(process.env.EVIDENCE_EXPIRY_SCAN_INTERVAL_MS);
    const interval =
      Number.isFinite(configured) && configured > 0
        ? configured
        : DEFAULT_INTERVAL_MS;
    this.timer = setInterval(() => void this.scanExpiredEvidence(), interval);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async scanExpiredEvidence(now = new Date()) {
    const expired = await this.prisma.sectionArtifact.findMany({
      where: { expiresAt: { lt: now }, status: { not: 'REJECTED' } },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            companyId: true,
            ownerId: true,
            reviewerId: true,
            approverId: true,
          },
        },
      },
    });
    let notified = 0;
    for (const artifact of expired) {
      const recipients = [
        ...new Set(
          [
            artifact.project.ownerId,
            artifact.project.reviewerId,
            artifact.project.approverId,
          ].filter((id): id is string => Boolean(id)),
        ),
      ];
      for (const userId of recipients) {
        const title = `Evidence expired: ${artifact.originalName}`;
        const recent = await this.prisma.notification.findFirst({
          where: {
            userId,
            title,
            createdAt: { gte: new Date(now.getTime() - DEFAULT_INTERVAL_MS) },
          },
          select: { id: true },
        });
        if (recent) continue;
        await this.notifications.create({
          userId,
          title,
          body: `Evidence for ${artifact.project.name} expired and needs review.`,
          type: 'evidence_expired',
          meta: { projectId: artifact.project.id, artifactId: artifact.id },
        });
        notified += 1;
      }
      if (artifact.project.companyId) {
        const event = await this.prisma.auditEvent.findFirst({
          where: {
            companyId: artifact.project.companyId,
            projectId: artifact.project.id,
            entityType: 'SectionArtifact',
            entityId: artifact.id,
            action: 'EXPIRED',
          },
          select: { id: true },
        });
        if (!event) {
          await this.audit.record({
            companyId: artifact.project.companyId,
            projectId: artifact.project.id,
            actorId: artifact.project.ownerId,
            entityType: 'SectionArtifact',
            entityId: artifact.id,
            action: 'EXPIRED',
            afterSnapshot: {
              expiresAt: artifact.expiresAt?.toISOString(),
              status: artifact.status,
            },
          });
        }
      }
    }
    return { expired: expired.length, notified };
  }
}

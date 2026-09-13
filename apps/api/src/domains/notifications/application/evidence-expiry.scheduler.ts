import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service';
import { AuditService } from '../../audit/application/audit.service';
import { NotificationsService } from './notifications.service';

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class EvidenceExpiryScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EvidenceExpiryScheduler.name);
  private running = false;
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
    this.timer = setInterval(() => {
      if (this.running) return;
      this.running = true;
      void this.scanExpiredEvidence()
        .catch(() => this.logger.error('Evidence expiry scan failed'))
        .finally(() => {
          this.running = false;
        });
    }, interval);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async scanExpiredEvidence(now = new Date()) {
    const expired = await this.prisma.sectionArtifact.findMany({
      where: { OR: [{ expiresAt: { lt: now } }, { status: 'REJECTED' }] },
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
      if (artifact.project.companyId) {
        await this.prisma.$transaction(async (tx) => {
          // Serialize workers on the artifact; finding and audit commit together.
          await tx.$queryRaw`SELECT id FROM "SectionArtifact" WHERE id = ${artifact.id} FOR UPDATE`;
          const current = await tx.sectionArtifact.findUnique({
            where: { id: artifact.id },
          });
          if (
            !current ||
            (current.status !== 'REJECTED' &&
              (!current.expiresAt || current.expiresAt >= now))
          )
            return;
          const links = await tx.obligationEvidence.findMany({
            where: {
              artifactId: artifact.id,
              obligation: { projectId: artifact.projectId },
            },
            include: { obligation: { include: { obligation: true } } },
          });
          const issue =
            current.status === 'REJECTED'
              ? 'Evidence was rejected during review.'
              : 'Evidence has expired.';
          const eventKey = `${artifact.id}:${current.status}:${current.expiresAt?.toISOString() ?? ''}`;
          for (const link of links) {
            const existing = await tx.finding.findFirst({
              where: {
                projectId: artifact.projectId,
                obligationId: link.aiSystemObligationId,
                source: 'EVIDENCE_REVIEW',
                evidenceBasis: { path: ['eventKey'], equals: eventKey },
              },
            });
            if (existing) continue;
            const finding = await tx.finding.create({
              data: {
                projectId: artifact.projectId,
                companyId: artifact.project.companyId,
                obligationId: link.aiSystemObligationId,
                source: 'EVIDENCE_REVIEW',
                severity: 'HIGH',
                description: `${link.obligation.obligation.title}: ${issue}`,
                evidenceBasis: {
                  artifactId: artifact.id,
                  evidenceLinkId: link.id,
                  eventKey,
                },
              },
            });
            await this.audit.record(
              {
                companyId: artifact.project.companyId!,
                projectId: artifact.projectId,
                entityType: 'Finding',
                entityId: finding.id,
                action: 'CREATED_FROM_EVIDENCE',
                afterSnapshot: { description: finding.description },
                metadata: { source: 'evidence-expiry-worker', eventKey },
              },
              tx,
            );
          }
        });
      }
      if (!artifact.expiresAt || artifact.expiresAt >= now) continue;
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
            metadata: { source: 'evidence-expiry-worker' },
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

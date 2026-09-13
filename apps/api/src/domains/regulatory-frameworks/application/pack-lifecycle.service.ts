import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PackStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service';
import type { AuthUserContext } from '../../organizations/application/membership/company-context.service';

@Injectable()
export class PackLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAdmin(actor: AuthUserContext) {
    const hasAdminMembership = actor.companies?.some(
      (membership) =>
        membership.role === 'ADMIN' || membership.role === 'COMPANY_ADMIN',
    );
    if (
      actor.role !== 'ADMIN' &&
      actor.role !== 'COMPANY_ADMIN' &&
      !hasAdminMembership
    ) {
      throw new ForbiddenException('Only an administrator can manage packs');
    }
  }

  async publish(packId: string, actor: AuthUserContext, companyId?: string) {
    this.assertAdmin(actor);
    return this.prisma.$transaction(
      async (tx) => {
        const pack = await tx.compliancePackVersion.findUnique({
          where: { id: packId },
        });
        if (!pack) throw new NotFoundException('Compliance pack not found');
        if (pack.status !== PackStatus.DRAFT) {
          throw new ConflictException(
            'Only draft compliance packs can be published',
          );
        }
        const publishedAt = new Date();
        const updated = await tx.compliancePackVersion.update({
          where: { id: packId },
          data: { status: PackStatus.PUBLISHED, publishedAt },
        });
        await tx.auditEvent.create({
          data: {
            companyId: companyId ?? null,
            actorId: actor.userId,
            entityType: 'CompliancePackVersion',
            entityId: pack.id,
            action: 'PUBLISHED',
            beforeSnapshot: {
              status: pack.status,
              publishedAt: pack.publishedAt,
            },
            afterSnapshot: {
              status: updated.status,
              publishedAt: updated.publishedAt,
            },
            packVersion: `${pack.key}@${pack.version}`,
          },
        });
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async deprecate(packId: string, actor: AuthUserContext, companyId?: string) {
    this.assertAdmin(actor);
    return this.prisma.$transaction(
      async (tx) => {
        const pack = await tx.compliancePackVersion.findUnique({
          where: { id: packId },
        });
        if (!pack) throw new NotFoundException('Compliance pack not found');
        if (pack.status !== PackStatus.PUBLISHED) {
          throw new ConflictException(
            'Only published compliance packs can be deprecated',
          );
        }
        const deprecatedAt = new Date();
        const updated = await tx.compliancePackVersion.update({
          where: { id: packId },
          data: { status: PackStatus.DEPRECATED, deprecatedAt },
        });
        await tx.auditEvent.create({
          data: {
            companyId: companyId ?? null,
            actorId: actor.userId,
            entityType: 'CompliancePackVersion',
            entityId: pack.id,
            action: 'DEPRECATED',
            beforeSnapshot: {
              status: pack.status,
              deprecatedAt: pack.deprecatedAt,
            },
            afterSnapshot: {
              status: updated.status,
              deprecatedAt: updated.deprecatedAt,
            },
            packVersion: `${pack.key}@${pack.version}`,
          },
        });
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  BillingPlan,
  BillingUsage,
} from '@complianx/contracts/ai-systems';
import { PrismaService } from '../../../platform/database/prisma.service';
import { Prisma } from '@prisma/client';

type UsageType = 'docgen' | 'trust' | 'review';
export type DocumentQuotaReservation = {
  id: string;
  companyId: string;
  month: string;
  amount: number;
  status: 'ACTIVE' | 'COMMITTED' | 'RELEASED';
} | null;

@Injectable()
export class MonetizationService {
  constructor(private readonly prisma: PrismaService) {}

  private isEnabled() {
    return process.env.MONETIZATION_ENABLED !== 'false';
  }

  getLimits(plan: string | null | undefined): BillingPlan['limits'] {
    if (!this.isEnabled()) {
      return {
        docs: Number.MAX_SAFE_INTEGER,
        trust: Number.MAX_SAFE_INTEGER,
        reviews: Number.MAX_SAFE_INTEGER,
      };
    }
    const freeDocs = parseInt(process.env.FREE_DOCS_PER_MONTH || '3', 10);
    const freeTrust = parseInt(process.env.FREE_ANALYSES_PER_MONTH || '10', 10);
    const freeReviews = parseInt(
      process.env.FREE_REVIEWS_PER_MONTH || '25',
      10,
    );
    const proDocs = parseInt(process.env.PRO_DOCS_PER_MONTH || '25', 10);
    const proTrust = parseInt(process.env.PRO_ANALYSES_PER_MONTH || '250', 10);
    const proReviews = parseInt(process.env.PRO_REVIEWS_PER_MONTH || '250', 10);
    switch ((plan || 'FREE').toUpperCase()) {
      case 'PRO':
        return { docs: proDocs, trust: proTrust, reviews: proReviews };
      case 'ENTERPRISE':
        return {
          docs: Number.MAX_SAFE_INTEGER,
          trust: Number.MAX_SAFE_INTEGER,
          reviews: Number.MAX_SAFE_INTEGER,
        };
      case 'FREE':
      default:
        return { docs: freeDocs, trust: freeTrust, reviews: freeReviews };
    }
  }

  private currentMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  async getCompanyForProject(projectId: string) {
    const proj = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!proj) throw new BadRequestException('Project not found');
    if (!proj.companyId) return { id: null, plan: 'FREE' };
    const company = await this.prisma.company.findUnique({
      where: { id: proj.companyId },
    });
    return { id: company?.id || null, plan: company?.plan || 'FREE' };
  }

  async getUsage(
    companyId: string,
    month = this.currentMonth(),
  ): Promise<BillingUsage> {
    let usage = await this.prisma.companyUsage.findUnique({
      where: { companyId_month: { companyId, month } },
    });
    if (!usage) {
      usage = await this.prisma.companyUsage.create({
        data: { companyId, month, docsGenerated: 0, trustAnalyses: 0 },
      });
    }
    return usage;
  }

  private pickLimitKey(type: UsageType) {
    if (type === 'docgen') return 'docs';
    if (type === 'trust') return 'trust';
    return 'reviews';
  }

  async checkAndConsumeForProject(
    projectId: string,
    type: UsageType,
    amount = 1,
  ) {
    if (!this.isEnabled()) {
      return;
    }
    const { id: companyId, plan } = await this.getCompanyForProject(projectId);
    const normalizedPlan = (plan || 'FREE').toUpperCase();
    if (type === 'review' && normalizedPlan === 'FREE') {
      throw new BadRequestException({
        code: 'PAYWALL',
        message: 'Review features require a paid plan',
        plan: normalizedPlan,
      });
    }
    // If no company (personal), treat as FREE
    const limits = this.getLimits(plan);
    if (!companyId) {
      if (type === 'review') {
        throw new BadRequestException({
          code: 'PAYWALL',
          message: 'Review features require a paid plan',
          plan: normalizedPlan,
        });
      }
      // in case of no company, we cannot persist usage; allow small free burst
      const cap =
        (this.pickLimitKey(type) === 'docs' ? limits.docs : limits.trust) ??
        Number.MAX_SAFE_INTEGER;
      if (cap < amount) {
        throw new BadRequestException({
          code: 'PAYWALL',
          message: 'Limit reached',
          plan,
          limit: cap,
        });
      }
      return; // allow
    }
    const month = this.currentMonth();
    const key = this.pickLimitKey(type);
    const limit = (limits as any)[key] as number;
    await this.prisma.companyUsage.upsert({
      where: { companyId_month: { companyId, month } },
      create: { companyId, month, docsGenerated: 0 },
      update: {},
    });
    const changed =
      key === 'trust'
        ? await this.prisma.$executeRaw(
            Prisma.sql`UPDATE "CompanyUsage" SET "trustAnalyses" = "trustAnalyses" + ${amount} WHERE "companyId" = ${companyId} AND "month" = ${month} AND "trustAnalyses" + ${amount} <= ${limit}`,
          )
        : await this.prisma.$executeRaw(
            Prisma.sql`UPDATE "CompanyUsage" SET "reviewsLogged" = "reviewsLogged" + ${amount} WHERE "companyId" = ${companyId} AND "month" = ${month} AND "reviewsLogged" + ${amount} <= ${limit}`,
          );
    if (changed !== 1) {
      throw new BadRequestException({
        code: 'PAYWALL',
        message: 'Monthly limit reached',
        plan,
        limit,
      });
    }
  }

  async reserveDocumentsForProject(
    projectId: string,
    amount = 1,
    operationKey?: string,
  ): Promise<DocumentQuotaReservation> {
    if (!this.isEnabled() || amount <= 0) return null;
    const { id: companyId, plan } = await this.getCompanyForProject(projectId);
    if (!companyId) return null;
    const limit = this.getLimits(plan).docs;
    if (limit >= Number.MAX_SAFE_INTEGER) return null;
    const month = this.currentMonth();
    if (operationKey) {
      const existing = await this.prisma.documentQuotaReservation.findUnique({
        where: { operationKey },
      });
      if (existing) return existing;
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.companyUsage.upsert({
        where: { companyId_month: { companyId, month } },
        create: { companyId, month, docsGenerated: 0 },
        update: {},
      });
      const usage = await tx.$queryRaw<Array<{ docsGenerated: number }>>(
        Prisma.sql`SELECT "docsGenerated" FROM "CompanyUsage" WHERE "companyId" = ${companyId} AND "month" = ${month} FOR UPDATE`,
      );
      const reserved = await tx.documentQuotaReservation.aggregate({
        _sum: { amount: true },
        where: {
          companyId,
          month,
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
      });
      const used = usage[0]?.docsGenerated ?? 0;
      const active = reserved._sum.amount ?? 0;
      if (used + active + amount > limit) {
        throw new BadRequestException({
          code: 'PAYWALL',
          message: 'Monthly document limit reached',
          plan,
          limit,
        });
      }
      const reservation = await tx.documentQuotaReservation.create({
        data: {
          companyId,
          month,
          amount,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          operationKey,
        },
      });
      return reservation;
    });
  }

  async commitDocumentReservation(
    reservation: DocumentQuotaReservation,
    client?: Prisma.TransactionClient,
  ) {
    if (!reservation || reservation.status === 'COMMITTED') return;
    if (reservation.status === 'RELEASED')
      throw new BadRequestException('Document quota reservation was released');
    const commit = async (tx: Prisma.TransactionClient) => {
      const changed = await tx.documentQuotaReservation.updateMany({
        where: {
          id: reservation.id,
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
        data: { status: 'COMMITTED', committedAt: new Date() },
      });
      if (changed.count !== 1)
        throw new BadRequestException(
          'Document quota reservation is no longer valid',
        );
      await tx.companyUsage.update({
        where: {
          companyId_month: {
            companyId: reservation.companyId,
            month: reservation.month,
          },
        },
        data: { docsGenerated: { increment: reservation.amount } },
      });
    };
    if (client) await commit(client);
    else await this.prisma.$transaction(commit);
  }

  async releaseDocumentReservation(reservation: DocumentQuotaReservation) {
    if (!reservation || reservation.status !== 'ACTIVE') return;
    await this.prisma.documentQuotaReservation.updateMany({
      where: { id: reservation.id, status: 'ACTIVE' },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });
  }
}

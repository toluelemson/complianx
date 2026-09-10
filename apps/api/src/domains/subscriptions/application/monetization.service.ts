import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  BillingPlan,
  BillingUsage,
} from '@complianx/contracts/ai-systems';
import { PrismaService } from '../../../platform/database/prisma.service';
import { Prisma } from '@prisma/client';

type UsageType = 'docgen' | 'trust' | 'review';
export type DocumentQuotaReservation = {
  companyId: string;
  month: string;
  amount: number;
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
      create: { companyId, month, docsGenerated: 0, docsReserved: 0 },
      update: {},
    });
    const column = key === 'trust' ? 'trustAnalyses' : 'reviewsLogged';
    const changed = await this.prisma.$executeRawUnsafe(
      `
      UPDATE "CompanyUsage"
      SET "${column}" = "${column}" + $3
      WHERE "companyId" = $1
        AND "month" = $2
        AND "${column}" + $3 <= $4
    `,
      companyId,
      month,
      amount,
      limit,
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
  ): Promise<DocumentQuotaReservation> {
    if (!this.isEnabled() || amount <= 0) return null;
    const { id: companyId, plan } = await this.getCompanyForProject(projectId);
    if (!companyId) return null;
    const limit = this.getLimits(plan).docs;
    if (limit >= Number.MAX_SAFE_INTEGER) return null;
    const month = this.currentMonth();
    await this.prisma.companyUsage.upsert({
      where: { companyId_month: { companyId, month } },
      create: { companyId, month, docsGenerated: 0, docsReserved: 0 },
      update: {},
    });
    const changed = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "CompanyUsage"
      SET "docsReserved" = "docsReserved" + ${amount}
      WHERE "companyId" = ${companyId}
        AND "month" = ${month}
        AND "docsGenerated" + "docsReserved" + ${amount} <= ${limit}
    `);
    if (changed !== 1) {
      throw new BadRequestException({
        code: 'PAYWALL',
        message: 'Monthly document limit reached',
        plan,
        limit,
      });
    }
    return { companyId, month, amount };
  }

  async commitDocumentReservation(
    reservation: DocumentQuotaReservation,
    client: Prisma.TransactionClient = this.prisma,
  ) {
    if (!reservation) return;
    const changed = await client.companyUsage.updateMany({
      where: {
        companyId: reservation.companyId,
        month: reservation.month,
        docsReserved: { gte: reservation.amount },
      },
      data: {
        docsReserved: { decrement: reservation.amount },
        docsGenerated: { increment: reservation.amount },
      },
    });
    if (changed.count !== 1) {
      throw new BadRequestException(
        'Document quota reservation is no longer valid',
      );
    }
  }

  async releaseDocumentReservation(reservation: DocumentQuotaReservation) {
    if (!reservation) return;
    await this.prisma.companyUsage.updateMany({
      where: {
        companyId: reservation.companyId,
        month: reservation.month,
        docsReserved: { gte: reservation.amount },
      },
      data: { docsReserved: { decrement: reservation.amount } },
    });
  }
}

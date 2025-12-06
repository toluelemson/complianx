import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type UsageType = 'docgen' | 'trust' | 'review';

@Injectable()
export class MonetizationService {
  constructor(private readonly prisma: PrismaService) {}

  getLimits(plan: string | null | undefined) {
    const freeDocs = parseInt(process.env.FREE_DOCS_PER_MONTH || '3', 10);
    const freeTrust = parseInt(process.env.FREE_ANALYSES_PER_MONTH || '10', 10);
    const freeReviews = parseInt(process.env.FREE_REVIEWS_PER_MONTH || '25', 10);
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
    const proj = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!proj) throw new BadRequestException('Project not found');
    if (!proj.companyId) return { id: null, plan: 'FREE' };
    const company = await this.prisma.company.findUnique({ where: { id: proj.companyId } });
    return { id: company?.id || null, plan: company?.plan || 'FREE' };
  }

  async getUsage(companyId: string, month = this.currentMonth()) {
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

  async checkAndConsumeForProject(projectId: string, type: UsageType, amount = 1) {
    const { id: companyId, plan } = await this.getCompanyForProject(projectId);
    const normalizedPlan = (plan || 'FREE').toUpperCase();
    if (type === 'review' && normalizedPlan === 'FREE') {
      throw new BadRequestException({ code: 'PAYWALL', message: 'Review features require a paid plan', plan: normalizedPlan });
    }
    // If no company (personal), treat as FREE
    const limits = this.getLimits(plan);
    if (!companyId) {
      if (type === 'review') {
        throw new BadRequestException({ code: 'PAYWALL', message: 'Review features require a paid plan', plan: normalizedPlan });
      }
      // in case of no company, we cannot persist usage; allow small free burst
      const cap = this.pickLimitKey(type) === 'docs' ? limits.docs : limits.trust;
      if (cap < amount) {
        throw new BadRequestException({ code: 'PAYWALL', message: 'Limit reached', plan, limit: cap });
      }
      return; // allow
    }
    const month = this.currentMonth();
    const usage = await this.getUsage(companyId, month);
    const key = this.pickLimitKey(type);
    const limit = (limits as any)[key] as number;
    const usageAny = usage as any;
    const current =
      key === 'docs'
        ? usage.docsGenerated
        : key === 'trust'
          ? usage.trustAnalyses
          : usageAny.reviewsLogged ?? 0;
    if (current + amount > limit) {
      throw new BadRequestException({ code: 'PAYWALL', message: 'Monthly limit reached', plan, limit, usage: current });
    }
    const dataUpdate =
      key === 'docs'
        ? { docsGenerated: { increment: amount } }
        : key === 'trust'
          ? { trustAnalyses: { increment: amount } }
          : { reviewsLogged: { increment: amount } };
    await this.prisma.companyUsage.update({
      where: { companyId_month: { companyId, month } },
      data: dataUpdate,
    });
  }
}

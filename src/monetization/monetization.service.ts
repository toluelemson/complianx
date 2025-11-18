import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type UsageType = 'docgen' | 'trust';

@Injectable()
export class MonetizationService {
  constructor(private readonly prisma: PrismaService) {}

  private getLimits(plan: string | null | undefined) {
    const freeDocs = parseInt(process.env.FREE_DOCS_PER_MONTH || '3', 10);
    const freeTrust = parseInt(process.env.FREE_ANALYSES_PER_MONTH || '10', 10);
    const proDocs = parseInt(process.env.PRO_DOCS_PER_MONTH || '25', 10);
    const proTrust = parseInt(process.env.PRO_ANALYSES_PER_MONTH || '250', 10);
    switch ((plan || 'FREE').toUpperCase()) {
      case 'PRO':
        return { docs: proDocs, trust: proTrust };
      case 'ENTERPRISE':
        return { docs: Number.MAX_SAFE_INTEGER, trust: Number.MAX_SAFE_INTEGER };
      case 'FREE':
      default:
        return { docs: freeDocs, trust: freeTrust };
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
    return type === 'docgen' ? 'docs' : 'trust';
  }

  async checkAndConsumeForProject(projectId: string, type: UsageType, amount = 1) {
    const { id: companyId, plan } = await this.getCompanyForProject(projectId);
    // If no company (personal), treat as FREE
    const limits = this.getLimits(plan);
    if (!companyId) {
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
    const current = key === 'docs' ? usage.docsGenerated : usage.trustAnalyses;
    if (current + amount > limit) {
      throw new BadRequestException({ code: 'PAYWALL', message: 'Monthly limit reached', plan, limit, usage: current });
    }
    if (type === 'docgen') {
      await this.prisma.companyUsage.update({
        where: { companyId_month: { companyId, month } },
        data: { docsGenerated: { increment: amount } },
      });
    } else {
      await this.prisma.companyUsage.update({
        where: { companyId_month: { companyId, month } },
        data: { trustAnalyses: { increment: amount } },
      });
    }
  }
}


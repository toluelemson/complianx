import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { BillingPlan, BillingUsage } from '@complianx/contracts/ai-systems';
import { JwtAuthGuard } from '../../../platform/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../../platform/auth/authenticated-request.type';
import { PrismaService } from '../../../platform/database/prisma.service';
import { MonetizationService } from '../application/monetization.service';
import { BillingService } from '../application/billing.service';
import { CompanyContextService } from '../../organizations/application/membership/company-context.service';

@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly monetization: MonetizationService,
    private readonly billing: BillingService,
    private readonly companyContext: CompanyContextService,
  ) {}

  private resolveCompanyId(req: AuthenticatedRequest) {
    return this.companyContext.resolveCompany(
      req.user,
      (req.headers?.['x-company-id'] as string | undefined) ?? undefined,
    ).companyId;
  }

  @Get('plan')
  async getPlan(@Req() req: AuthenticatedRequest): Promise<BillingPlan> {
    const companyId = this.resolveCompanyId(req);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    const plan = company?.plan || 'FREE';
    const limits = this.monetization.getLimits(plan);
    return { plan, limits };
  }

  @Get('usage')
  async getUsage(@Req() req: AuthenticatedRequest): Promise<BillingUsage> {
    const companyId = this.resolveCompanyId(req);
    const u = await this.monetization.getUsage(companyId);
    return u;
  }

  @Post('checkout')
  async checkout(
    @Body() body: { plan: 'PRO' | 'ENTERPRISE' },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!body?.plan) {
      throw new BadRequestException('Select a plan to upgrade');
    }
    if (!this.billing.isEnabled()) {
      return {
        url: null,
        message: 'Stripe not configured. Contact support to upgrade.',
      };
    }
    const companyId = this.resolveCompanyId(req);
    const url = await this.billing.createCheckoutSession(
      req.user.userId,
      companyId,
      body.plan,
    );
    return { url };
  }

  @Post('portal')
  async portal(@Req() req: AuthenticatedRequest) {
    if (!this.billing.isEnabled()) {
      return { url: null, message: 'Stripe not configured.' };
    }
    const companyId = this.resolveCompanyId(req);
    const url = await this.billing.createPortalSession(
      req.user.userId,
      companyId,
    );
    return { url };
  }
}

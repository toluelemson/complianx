import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { MonetizationService } from '../monetization/monetization.service';
import { BillingService } from './billing.service';
import { CompanyContextService } from '../company/company-context.service';

@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly monetization: MonetizationService,
    private readonly billing: BillingService,
    private readonly companyContext: CompanyContextService,
  ) {}

  private resolveCompanyId(req: any) {
    return this.companyContext.resolveCompany(
      req.user,
      (req.headers?.['x-company-id'] as string | undefined) ?? undefined,
    ).companyId;
  }

  @Get('plan')
  async getPlan(@Request() req) {
    const companyId = this.resolveCompanyId(req);
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const plan = company?.plan || 'FREE';
    const limits = this.monetization.getLimits(plan);
    return { plan, limits };
  }

  @Get('usage')
  async getUsage(@Request() req) {
    const companyId = this.resolveCompanyId(req);
    const u = await this.monetization.getUsage(companyId);
    return u;
  }

  @Post('checkout')
  async checkout(@Body() body: { plan: 'PRO' | 'ENTERPRISE' }, @Request() req) {
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
  async portal(@Request() req) {
    if (!this.billing.isEnabled()) {
      return { url: null, message: 'Stripe not configured.' };
    }
    const companyId = this.resolveCompanyId(req);
    const url = await this.billing.createPortalSession(req.user.userId, companyId);
    return { url };
  }
}

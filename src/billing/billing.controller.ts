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

@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly monetization: MonetizationService,
    private readonly billing: BillingService,
  ) {}

  @Get('plan')
  async getPlan(@Request() req) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.userId } });
    const company = user?.companyId
      ? await this.prisma.company.findUnique({ where: { id: user.companyId } })
      : null;
    const plan = company?.plan || 'FREE';
    const limits = (this.monetization as any).getLimits(plan);
    return { plan, limits };
  }

  @Get('usage')
  async getUsage(@Request() req) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user?.companyId) return { month: '', docsGenerated: 0, trustAnalyses: 0 };
    const u = await this.monetization.getUsage(user.companyId);
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
    const url = await this.billing.createCheckoutSession(req.user.userId, body.plan);
    return { url };
  }

  @Post('portal')
  async portal(@Request() req) {
    if (!this.billing.isEnabled()) {
      return { url: null, message: 'Stripe not configured.' };
    }
    const url = await this.billing.createPortalSession(req.user.userId);
    return { url };
  }
}

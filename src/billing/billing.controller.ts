import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { MonetizationService } from '../monetization/monetization.service';

@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly monetization: MonetizationService,
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
    // Placeholder: if Stripe is configured, create checkout; otherwise return hint
    const hasStripe = Boolean(process.env.STRIPE_SECRET_KEY);
    if (!hasStripe) {
      return { url: null, message: 'Stripe not configured. Contact support to upgrade.' };
    }
    // You can wire Stripe session creation here later
    return { url: null, message: 'Checkout integration pending.' };
  }

  @Get('portal')
  async portal() {
    const hasStripe = Boolean(process.env.STRIPE_SECRET_KEY);
    if (!hasStripe) {
      return { url: null, message: 'Stripe not configured.' };
    }
    return { url: null };
  }
}


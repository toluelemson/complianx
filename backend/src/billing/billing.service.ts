import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Plan } from '@prisma/client';

type PaidPlan = Exclude<Plan, 'FREE'>;

@Injectable()
export class BillingService {
  private readonly stripe: Stripe | null;
  private readonly frontendUrl: string;
  private readonly webhookSecret?: string;
  private readonly priceMap: Record<PaidPlan, string | undefined>;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = this.config.get<string>('STRIPE_SECRET_KEY');
    const frontends = this.config.get<string>('FRONTEND_URL') ?? '';
    console.log('Configured FRONTEND_URL:', frontends);
    this.frontendUrl =
      frontends
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)[0] ?? 'http://localhost:5173';
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    console.log('Stripe Webhook Secret:', this.webhookSecret);
    this.stripe = secret ? new Stripe(secret) : null;
    this.priceMap = {
      PRO: this.config.get<string>('STRIPE_PRICE_PRO'),
      ENTERPRISE: this.config.get<string>('STRIPE_PRICE_ENTERPRISE'),
    };
  }

  isEnabled() {
    return Boolean(
      this.stripe &&
        Object.values(this.priceMap).every((priceId) => Boolean(priceId)),
    );
  }

  async createCheckoutSession(userId: string, plan: PaidPlan) {
    if (!this.isEnabled() || !this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }
    const priceId = this.priceMap[plan];
    if (!priceId) {
      throw new BadRequestException(`Price for plan ${plan} is not configured`);
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    let company = user.company;
    if (!company) {
      company = await this.prisma.company.create({
        data: {
          name: `${user.email}'s Workspace`,
          billingEmail: user.email,
        },
      });
      await this.prisma.user.update({
        where: { id: user.id },
        data: { companyId: company.id },
      });
    }
    let customerId = company.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        name: company.name,
        email: company.billingEmail ?? user.email,
        metadata: { companyId: company.id },
      });
      customerId = customer.id;
      await this.prisma.company.update({
        where: { id: company.id },
        data: { stripeCustomerId: customerId },
      });
    }
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${this.frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.frontendUrl}/billing/cancel`,
      metadata: {
        companyId: company.id,
        plan,
      },
      subscription_data: {
        metadata: {
          companyId: company.id,
          plan,
        },
      },
    });
    if (!session?.url) {
      throw new InternalServerErrorException('Unable to create checkout session');
    }
    return session.url;
  }

  async createPortalSession(userId: string) {
    if (!this.isEnabled() || !this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });
    if (!user?.company) {
      throw new NotFoundException('Join a company to manage billing');
    }
    if (!user.company.stripeCustomerId) {
      throw new BadRequestException(
        'No customer on file. Start a new checkout first.',
      );
    }
    const portal = await this.stripe.billingPortal.sessions.create({
      customer: user.company.stripeCustomerId,
      return_url: `${this.frontendUrl}/billing`,
    });
    return portal.url;
  }

  async handleWebhook(signature: string | string[] | undefined, payload: Buffer) {
    if (!this.stripe || !this.webhookSecret) {
      throw new BadRequestException('Stripe webhook not configured');
    }
    if (!signature || Array.isArray(signature)) {
      throw new BadRequestException('Missing Stripe signature');
    }
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
    } catch (error) {
      throw new BadRequestException(`Invalid Stripe signature: ${error.message}`);
    }
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      default:
        break;
    }
    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const companyId = session.metadata?.companyId;
    const plan = session.metadata?.plan as PaidPlan | undefined;
    if (!companyId || !plan) {
      return;
    }
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        plan,
        stripeCustomerId:
          (session.customer as string) ?? session.customer_details?.email ?? null,
        stripeSubscriptionId: subscriptionId ?? null,
      },
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    console.log('[Stripe] subscription update', subscription.id, subscription.status);
    const company = await this.prisma.company.findFirst({
      where: {
        OR: [
          { stripeSubscriptionId: subscription.id },
          { stripeCustomerId: subscription.customer as string },
        ],
      },
    });
    if (!company) {
      return;
    }
    let nextPlan: Plan = company.plan;
    if (
      subscription.status === 'canceled' ||
      subscription.status === 'unpaid' ||
      subscription.status === 'incomplete' ||
      subscription.status === 'incomplete_expired' ||
      subscription.cancel_at_period_end
    ) {
      nextPlan = 'FREE';
    } else {
      const priceId = subscription.items.data[0]?.price?.id;
      const mapped = this.getPlanFromPrice(priceId);
      if (mapped) {
        nextPlan = mapped;
      }
    }
    console.log('[Stripe] updating company', company.id, 'nextPlan', nextPlan);
    await this.prisma.company.update({
      where: { id: company.id },
      data: {
        plan: nextPlan,
        stripeSubscriptionId: subscription.id,
      },
    });
  }

  private getPlanFromPrice(priceId?: string | null): Plan | null {
    if (!priceId) {
      return null;
    }
    return (Object.entries(this.priceMap) as [PaidPlan, string | undefined][])
      .find(([, value]) => value === priceId)?.[0] ?? null;
  }
}

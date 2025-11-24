import { ConfigService } from '@nestjs/config';
import { Plan } from '@prisma/client';
import Stripe from 'stripe';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('stripe', () => {
  const checkoutSessionsCreate = jest.fn();
  const billingPortalSessionsCreate = jest.fn();
  const customersCreate = jest.fn();
  const constructEvent = jest.fn();

  const mockClient = {
    checkout: { sessions: { create: checkoutSessionsCreate } },
    billingPortal: { sessions: { create: billingPortalSessionsCreate } },
    customers: { create: customersCreate },
    webhooks: { constructEvent },
  };

  const StripeConstructor = jest
    .fn(() => mockClient)
    .mockName('StripeConstructor') as jest.Mock & {
    __mockClient: typeof mockClient;
  };
  StripeConstructor.__mockClient = mockClient;

  return {
    __esModule: true,
    default: StripeConstructor,
  };
});

type MockedPrisma = {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  company: {
    create: jest.Mock;
    update: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
  };
};

describe('BillingService', () => {
  let service: BillingService;
  let prisma: MockedPrisma;
  let config: ConfigService;
  let stripeClient: any;

  const configValues: Record<string, string> = {
    STRIPE_SECRET_KEY: 'sk_test_123',
    STRIPE_PRICE_PRO: 'price_pro',
    STRIPE_PRICE_ENTERPRISE: 'price_ent',
    STRIPE_WEBHOOK_SECRET: 'whsec_test',
    FRONTEND_URL: 'http://localhost:5173',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      company: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    config = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;

    service = new BillingService(config, prisma as unknown as PrismaService);
    const stripeCtor = Stripe as unknown as jest.Mock & { __mockClient?: any };
    stripeClient = stripeCtor.mock?.results?.[0]?.value ?? stripeCtor.__mockClient;
  });

  describe('createCheckoutSession', () => {
    it('creates a checkout session for an existing company', async () => {
      const company = {
        id: 'company-1',
        name: 'Acme Corp',
        billingEmail: 'billing@acme.com',
        stripeCustomerId: 'cus_123',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'user@acme.com',
        company,
      });
      (stripeClient.checkout.sessions.create as jest.Mock).mockResolvedValue({
        url: 'https://stripe.test/checkout',
      });

      const url = await service.createCheckoutSession('user-1', 'PRO');

      expect(url).toBe('https://stripe.test/checkout');
      expect(stripeClient.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
          line_items: [{ price: 'price_pro', quantity: 1 }],
          success_url: expect.stringContaining('/billing/success'),
          metadata: { companyId: 'company-1', plan: 'PRO' },
        }),
      );
    });
  });

  describe('handleWebhook', () => {
    it('updates company on checkout completion', async () => {
      const session = {
        metadata: { companyId: 'company-1', plan: 'PRO' },
        subscription: 'sub_123',
        customer: 'cus_111',
      } as unknown as Stripe.Checkout.Session;

      stripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: session },
      });

      await service.handleWebhook('sig_test', Buffer.from('{}'));

      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: {
          plan: 'PRO',
          stripeCustomerId: 'cus_111',
          stripeSubscriptionId: 'sub_123',
        },
      });
    });

    it('downgrades plan when subscription is canceled', async () => {
      prisma.company.findFirst.mockResolvedValue({
        id: 'company-1',
        plan: 'PRO' as Plan,
      });
      const subscription = {
        id: 'sub_cancel',
        status: 'canceled',
        customer: 'cus_cancelled',
        items: { data: [{ price: { id: 'price_pro' } }] },
      } as unknown as Stripe.Subscription;

      stripeClient.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.updated',
        data: { object: subscription },
      });

      await service.handleWebhook('sig_test', Buffer.from('{}'));

      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: {
          plan: 'FREE',
          stripeSubscriptionId: 'sub_cancel',
        },
      });
    });
  });
});

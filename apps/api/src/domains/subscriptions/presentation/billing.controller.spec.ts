import { ForbiddenException } from '@nestjs/common';
import { BillingController } from './billing.controller';

describe('BillingController', () => {
  const prisma = {
    company: { findUnique: jest.fn() },
  };
  const monetization = {
    getLimits: jest.fn(),
    getUsage: jest.fn(),
  };
  const billing = {
    isEnabled: jest.fn(),
    createCheckoutSession: jest.fn(),
    createPortalSession: jest.fn(),
  };
  const companyContext = {
    resolveCompany: jest.fn(),
  };
  let controller: BillingController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new BillingController(
      prisma as never,
      monetization as never,
      billing as never,
      companyContext as never,
    );
  });

  it('allows any company member to see plan limits', async () => {
    companyContext.resolveCompany.mockReturnValue({
      companyId: 'company-1',
      membership: { companyId: 'company-1', role: 'USER' },
    });
    prisma.company.findUnique.mockResolvedValue({ plan: 'FREE' });
    monetization.getLimits.mockReturnValue({ docs: 3, trust: 1, reviews: 1 });

    await expect(controller.getPlan(request())).resolves.toEqual({
      plan: 'FREE',
      limits: { docs: 3, trust: 1, reviews: 1 },
    });
  });

  it('does not let an ordinary member open checkout or payment settings', async () => {
    companyContext.resolveCompany.mockReturnValue({
      companyId: 'company-1',
      membership: { companyId: 'company-1', role: 'USER' },
    });

    await expect(controller.checkout({ plan: 'PRO' }, request())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(controller.portal(request())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(billing.createCheckoutSession).not.toHaveBeenCalled();
    expect(billing.createPortalSession).not.toHaveBeenCalled();
  });

  it('lets a company administrator open checkout', async () => {
    companyContext.resolveCompany.mockReturnValue({
      companyId: 'company-1',
      membership: { companyId: 'company-1', role: 'ADMIN' },
    });
    billing.isEnabled.mockReturnValue(true);
    billing.createCheckoutSession.mockResolvedValue('https://billing.test');

    await expect(controller.checkout({ plan: 'PRO' }, request())).resolves.toEqual({
      url: 'https://billing.test',
    });
    expect(billing.createCheckoutSession).toHaveBeenCalledWith(
      'user-1',
      'company-1',
      'PRO',
    );
  });
});

function request() {
  return {
    user: {
      userId: 'user-1',
      companies: [{ companyId: 'company-1', role: 'USER' }],
    },
    headers: { 'x-company-id': 'company-1' },
  } as never;
}

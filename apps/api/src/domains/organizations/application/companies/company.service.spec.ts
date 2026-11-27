import { CompanyService } from './company.service';

describe('CompanyService organization profile', () => {
  it('persists organization name, registration number, country, and EU AI Act role', async () => {
    const prisma = {
      userCompany: {
        findUnique: jest.fn().mockResolvedValue({ role: 'ADMIN' }),
      },
      company: {
        update: jest.fn(({ data }) =>
          Promise.resolve({ id: 'company-1', ...data }),
        ),
      },
    };
    const service = new CompanyService(prisma as never);

    await service.updateProfile('admin-1', 'company-1', {
      organizationName: 'Example AI OÜ',
      registrationNumber: '12345678',
      country: 'Estonia',
      role: 'deployer',
    });

    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: 'company-1' },
      data: expect.objectContaining({
        name: 'Example AI OÜ',
        registrationNumber: '12345678',
        country: 'Estonia',
        aiActRole: 'DEPLOYER',
      }),
    });
  });
});

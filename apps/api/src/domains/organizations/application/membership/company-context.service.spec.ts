import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CompanyContextService } from './company-context.service';

describe('CompanyContextService', () => {
  const service = new CompanyContextService();

  it('selects an explicitly requested membership', () => {
    expect(
      service.resolveCompany(
        {
          userId: 'user-1',
          companies: [
            { companyId: 'company-1', role: 'USER' },
            { companyId: 'company-2', role: 'ADMIN' },
          ],
        },
        'company-2',
      ),
    ).toEqual({
      companyId: 'company-2',
      membership: { companyId: 'company-2', role: 'ADMIN' },
    });
  });

  it('rejects a requested organization outside the user memberships', () => {
    expect(() =>
      service.resolveCompany(
        {
          userId: 'user-1',
          companies: [{ companyId: 'company-1', role: 'USER' }],
        },
        'company-2',
      ),
    ).toThrow(ForbiddenException);
  });

  it('requires an organization context', () => {
    expect(() => service.resolveCompany({ userId: 'user-1' })).toThrow(
      NotFoundException,
    );
  });
});

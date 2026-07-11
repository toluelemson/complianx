import { ForbiddenException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

describe('ProjectsService access boundary', () => {
  function createService(membership: unknown) {
    const prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'project-1',
          name: 'Loan model',
          ownerId: 'owner-1',
          reviewerId: 'reviewer-1',
          approverId: 'approver-1',
          companyId: 'company-1',
        }),
      },
      userCompany: {
        findUnique: jest.fn().mockResolvedValue(membership),
      },
    };

    const service = new ProjectsService(
      prisma as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
    );
    return service;
  }

  it('grants an assigned reviewer access within the organization', async () => {
    const service = createService({
      userId: 'reviewer-1',
      companyId: 'company-1',
      role: 'REVIEWER',
    });

    await expect(
      service.assertAccess('project-1', 'reviewer-1', 'company-1', {
        allowReviewer: true,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        accessRole: 'REVIEWER',
        membershipRole: 'REVIEWER',
      }),
    );
  });

  it('rejects access without an organization membership', async () => {
    const service = createService(null);

    await expect(
      service.assertAccess('project-1', 'reviewer-1', 'company-1', {
        allowReviewer: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

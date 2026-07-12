import { ForbiddenException } from '@nestjs/common';
import { CompanyContextService } from '../../../organizations/application/membership/company-context.service';
import { ProjectsController } from './projects.controller';

describe('ProjectsController company context', () => {
  const projectsService = {
    listForUser: jest.fn(),
  };
  const controller = new ProjectsController(
    projectsService as never,
    new CompanyContextService(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards the explicitly requested company to the projects service', () => {
    const request = {
      headers: { 'x-company-id': 'company-2' },
      user: {
        userId: 'user-1',
        companies: [
          { companyId: 'company-1', role: 'USER' },
          { companyId: 'company-2', role: 'ADMIN' },
        ],
      },
    };

    void controller.list(request);

    expect(projectsService.listForUser).toHaveBeenCalledWith(
      'user-1',
      'company-2',
    );
  });

  it('rejects an unauthorized company before querying projects', () => {
    const request = {
      headers: { 'x-company-id': 'company-2' },
      user: {
        userId: 'user-1',
        companies: [{ companyId: 'company-1', role: 'USER' }],
      },
    };

    expect(() => controller.list(request)).toThrow(ForbiddenException);
    expect(projectsService.listForUser).not.toHaveBeenCalled();
  });
});

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OrganizationActor } from '../../domain/membership/organization-membership.types';

export type AuthUserContext = OrganizationActor;

@Injectable()
export class CompanyContextService {
  resolveCompany(
    user: OrganizationActor,
    requestedCompanyId?: string | null,
  ): { companyId: string; membership?: { companyId: string; role?: string } } {
    const memberships = user.companies ?? [];
    const firstMembershipId = memberships[0]?.companyId;
    const candidate =
      requestedCompanyId ??
      user.companyId ??
      user.defaultCompanyId ??
      firstMembershipId;
    if (!candidate) {
      throw new NotFoundException('Company context missing');
    }
    const membership = memberships.find(
      (entry) => entry.companyId === candidate,
    );
    if (membership) {
      return { companyId: candidate, membership };
    }
    if (user.companyId === candidate || user.defaultCompanyId === candidate) {
      return {
        companyId: candidate,
        membership: { companyId: candidate, role: user.role },
      };
    }
    throw new ForbiddenException('Not a member of the requested company');
  }
}

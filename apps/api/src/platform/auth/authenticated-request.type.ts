import type { Request } from 'express';
import type { AuthUserContext } from '../../domains/organizations/application/membership/company-context.service';

export type AuthenticatedRequest = Request & {
  user: AuthUserContext;
};

export type OrganizationRole = 'USER' | 'REVIEWER' | 'ADMIN' | 'COMPANY_ADMIN';

export interface OrganizationMembership {
  companyId: string;
  role?: OrganizationRole | string;
  companyName?: string;
}

export interface OrganizationActor {
  userId: string;
  role?: OrganizationRole | string;
  companyId?: string | null;
  defaultCompanyId?: string | null;
  companies?: OrganizationMembership[];
}

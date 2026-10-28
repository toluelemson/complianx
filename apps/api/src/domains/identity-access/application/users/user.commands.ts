export type IdentityRole = 'USER' | 'REVIEWER' | 'ADMIN';

export interface UpdateUserProfileCommand {
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  timezone?: string | null;
  preferredLocale?: string;
}

export interface UpdateUserRoleCommand {
  targetUserId: string;
  role: IdentityRole;
  companyId: string;
}

export interface SignupCommand {
  email: string;
  password: string;
  companyName?: string;
  companyId?: string;
  invitationToken?: string;
  accountType?: 'personal' | 'organization';
}

export interface LoginCommand {
  email: string;
  password: string;
}

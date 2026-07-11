export interface AuthenticatedUserContract {
  id: string;
  email: string;
  role: string;
  companyId?: string | null;
}

import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class SignupDto {
  /** Email address for the new account. */
  @IsEmail()
  email: string;

  /** Password with at least eight characters. */
  @IsString()
  @MinLength(8)
  password: string;

  /** Name of the workspace to create for an organization account. */
  @IsOptional()
  @IsString()
  companyName?: string;

  /** Existing workspace ID for an invitation or assisted onboarding flow. */
  @IsOptional()
  @IsString()
  companyId?: string;

  /** Token from a company invitation. */
  @IsOptional()
  @IsString()
  invitationToken?: string;

  /** Whether the account is personal or organization-managed. */
  @IsOptional()
  @IsIn(['personal', 'organization'])
  accountType?: 'personal' | 'organization';
}

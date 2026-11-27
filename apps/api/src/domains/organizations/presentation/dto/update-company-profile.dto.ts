import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateCompanyProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  organizationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value: unknown) => value !== '')
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value: unknown) => value !== '')
  @IsEmail()
  @MaxLength(320)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsIn(['provider', 'deployer'])
  role?: 'provider' | 'deployer';
}

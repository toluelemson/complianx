import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  riskLevel?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  intendedUse?: string;

  @IsOptional()
  @IsString()
  deploymentGeography?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  operatorRoles?: string[];

  @IsOptional()
  @IsString()
  sourcePublicResultId?: string;
}

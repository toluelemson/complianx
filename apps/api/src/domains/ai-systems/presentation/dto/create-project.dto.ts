import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export enum LifecycleStage {
  UNKNOWN = 'UNKNOWN',
  DESIGN = 'DESIGN',
  DEVELOPMENT = 'DEVELOPMENT',
  PILOT = 'PILOT',
  PRODUCTION = 'PRODUCTION',
  RETIRED = 'RETIRED',
}

export enum OperatorRole {
  PROVIDER = 'provider',
  DEPLOYER = 'deployer',
  IMPORTER = 'importer',
  DISTRIBUTOR = 'distributor',
  AUTHORIZED_REPRESENTATIVE = 'authorized_representative',
}

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  businessPurpose?: string;

  @IsOptional()
  @IsString()
  intendedUse?: string;

  @IsOptional()
  @IsString()
  intendedUsers?: string;

  @IsOptional()
  @IsString()
  affectedPersons?: string;

  @IsOptional()
  @IsString()
  deploymentGeography?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(OperatorRole, { each: true })
  operatorRoles?: string[];

  @IsOptional()
  @IsEnum(LifecycleStage)
  lifecycleStage?: LifecycleStage;

  @IsOptional()
  @IsString()
  responsibleOwner?: string;

  @IsOptional()
  @IsString()
  providerOrDeveloper?: string;

  @IsOptional()
  @IsString()
  deployerOrUser?: string;

  @IsOptional()
  @IsString()
  importer?: string;

  @IsOptional()
  @IsString()
  distributor?: string;

  @IsOptional()
  @IsString()
  authorizedRepresentative?: string;

  @IsOptional()
  @IsBoolean()
  generatesContent?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  useCaseIndicators?: string[];

  @IsOptional()
  @IsString()
  sourcePublicResultId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

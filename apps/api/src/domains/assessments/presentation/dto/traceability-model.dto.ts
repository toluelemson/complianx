import {
  AssessorType,
  ComplianceStakeholderRole,
  DocumentationItemType,
  LifecycleStage,
  SystemAssetType,
  TechnicalMeasureStatus,
} from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateSystemAssetDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsEnum(SystemAssetType)
  assetType!: SystemAssetType;

  @IsOptional()
  @IsEnum(LifecycleStage)
  lifecycleStage?: LifecycleStage;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  version?: string;
}

export class UpdateSystemAssetDto {
  @IsEnum(LifecycleStage)
  lifecycleStage!: LifecycleStage;
}

export class UpdateRequirementAssetLinksDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  assetIds!: string[];
}

export class CreateTechnicalMeasureDto {
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsEnum(TechnicalMeasureStatus)
  status?: TechnicalMeasureStatus;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  verificationNotes?: string;
}

export class UpdateTechnicalMeasureDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsEnum(TechnicalMeasureStatus)
  status?: TechnicalMeasureStatus;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  verificationNotes?: string;
}

export class CreateDocumentationItemDto {
  @IsEnum(DocumentationItemType)
  documentType!: DocumentationItemType;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ValidateIf((_object, value) => value !== undefined && value !== '')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  referenceUrl?: string;

  @IsOptional()
  @IsUUID('4')
  systemAssetId?: string;

  @IsOptional()
  @IsUUID('4')
  aiSystemObligationId?: string;
}

export class UpdateAssessmentContextDto {
  @IsEnum(AssessorType)
  assessorType!: AssessorType;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  assessorName?: string;

  @IsDateString()
  assessmentDate!: string;
}

export class CreateLifecycleEventDto {
  @IsEnum(LifecycleStage)
  stage!: LifecycleStage;

  @IsDateString()
  happenedAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}

export class CreateComplianceStakeholderDto {
  @IsEnum(ComplianceStakeholderRole)
  role!: ComplianceStakeholderRole;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  registrationNumber?: string;

  @IsOptional()
  @Matches(/^[A-Z]{2}$/i, { message: 'country must be a two-letter code' })
  country?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}

export class UpdateComplianceStakeholderDto {
  @IsOptional()
  @IsEnum(ComplianceStakeholderRole)
  role?: ComplianceStakeholderRole;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  registrationNumber?: string;

  @IsOptional()
  @Matches(/^[A-Z]{2}$/i, { message: 'country must be a two-letter code' })
  country?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}

import { FindingSeverity, FindingStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateFindingDto {
  @IsOptional()
  @IsEnum(FindingStatus)
  status?: FindingStatus;

  @IsOptional()
  @IsEnum(FindingSeverity)
  severity?: FindingSeverity;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  resolutionSummary?: string;

  @IsOptional()
  @IsString()
  reviewerDecision?: string;
}

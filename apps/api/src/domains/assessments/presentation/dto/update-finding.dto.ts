import { FindingSeverity, FindingStatus } from '@prisma/client';
import { IsEnum, ValidateIf, IsString } from 'class-validator';

export class UpdateFindingDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(FindingStatus)
  status?: FindingStatus;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(FindingSeverity)
  severity?: FindingSeverity;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  description?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  ownerId?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  resolutionSummary?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  reviewerDecision?: string;
}

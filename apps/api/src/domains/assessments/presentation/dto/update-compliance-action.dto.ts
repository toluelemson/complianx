import { ActionStatus, ObligationPriority } from '@prisma/client';
import { IsDateString, IsEnum, ValidateIf, IsString } from 'class-validator';

export class UpdateComplianceActionDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  title?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  description?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(ActionStatus)
  status?: ActionStatus;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  ownerId?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsDateString()
  dueAt?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(ObligationPriority)
  priority?: ObligationPriority;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  closureEvidenceId?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  closureNotes?: string;
}

import { ActionStatus, ObligationPriority } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateComplianceActionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ActionStatus)
  status?: ActionStatus;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsEnum(ObligationPriority)
  priority?: ObligationPriority;

  @IsOptional()
  @IsString()
  closureEvidenceId?: string;

  @IsOptional()
  @IsString()
  closureNotes?: string;
}

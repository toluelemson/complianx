import { ObligationApprovalState, ObligationPriority, ObligationStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateObligationDto {
  @IsOptional()
  @IsEnum(ObligationStatus)
  status?: ObligationStatus;

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
  @IsEnum(ObligationApprovalState)
  approvalState?: ObligationApprovalState;
}

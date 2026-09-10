import {
  ObligationApprovalState,
  ObligationPriority,
  ObligationStatus,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateObligationDto {
  @IsOptional()
  @IsEnum(ObligationStatus)
  @Transform(({ value }) =>
    value === 'READY_FOR_REVIEW'
      ? ObligationStatus.READY
      : value === 'SATISFIED'
        ? ObligationStatus.COMPLETE
        : value,
  )
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

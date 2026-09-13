import {
  ObligationApprovalState,
  ObligationPriority,
  ObligationStatus,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, ValidateIf, IsString } from 'class-validator';

export class UpdateObligationDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(ObligationStatus)
  @Transform(({ value }) =>
    value === 'READY_FOR_REVIEW'
      ? ObligationStatus.READY
      : value === 'SATISFIED'
        ? ObligationStatus.COMPLETE
        : value,
  )
  status?: ObligationStatus;

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
  @IsEnum(ObligationApprovalState)
  approvalState?: ObligationApprovalState;
}

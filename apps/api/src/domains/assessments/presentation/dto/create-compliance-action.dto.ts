import { ObligationPriority } from '@prisma/client';
import { IsDateString, IsEnum, ValidateIf, IsString } from 'class-validator';

export class CreateComplianceActionDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  findingId?: string;

  @IsString()
  title!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  description?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  ownerId?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsDateString()
  dueAt?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(ObligationPriority)
  priority?: ObligationPriority;
}

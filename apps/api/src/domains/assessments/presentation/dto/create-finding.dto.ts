import { FindingSeverity, FindingSource } from '@prisma/client';
import { IsEnum, ValidateIf, IsString } from 'class-validator';

export class CreateFindingDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  obligationId?: string;

  @IsEnum(FindingSource)
  source!: FindingSource;

  @IsEnum(FindingSeverity)
  severity!: FindingSeverity;

  @IsString()
  description!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  ownerId?: string;
}

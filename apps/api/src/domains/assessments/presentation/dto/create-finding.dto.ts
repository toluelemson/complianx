import { FindingSeverity, FindingSource } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateFindingDto {
  @IsOptional()
  @IsString()
  obligationId?: string;

  @IsEnum(FindingSource)
  source!: FindingSource;

  @IsEnum(FindingSeverity)
  severity!: FindingSeverity;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  ownerId?: string;
}

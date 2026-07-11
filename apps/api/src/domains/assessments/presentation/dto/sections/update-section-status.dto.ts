import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SectionStatus } from '@prisma/client';

export class UpdateSectionStatusDto {
  @IsEnum(SectionStatus)
  status: SectionStatus;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  signature?: string;
}

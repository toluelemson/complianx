import { ArtifactStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewArtifactDto {
  @IsEnum(ArtifactStatus)
  status: ArtifactStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

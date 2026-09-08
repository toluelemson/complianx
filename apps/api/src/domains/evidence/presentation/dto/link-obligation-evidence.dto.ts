import { EvidenceLinkType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class LinkObligationEvidenceDto {
  @IsOptional()
  @IsString()
  artifactId?: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsEnum(EvidenceLinkType)
  linkType?: EvidenceLinkType;

  @IsOptional()
  @IsString()
  notes?: string;
}

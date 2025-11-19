import { IsArray, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SegmentFilterDto {
  @IsString()
  column!: string;

  @IsArray()
  values!: (string | number)[];
}

class SegmentDto {
  @IsString()
  name!: string;

  @ValidateNested()
  @Type(() => SegmentFilterDto)
  filter!: SegmentFilterDto;
}

export class AnalyzeFairnessSegmentsDto {
  @IsString()
  projectId!: string;

  @IsString()
  datasetArtifactId!: string;

  @IsOptional()
  @IsObject()
  columns?: { sensitive_attribute?: string; y_true?: string; y_pred?: string };

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SegmentDto)
  segments!: SegmentDto[];
}


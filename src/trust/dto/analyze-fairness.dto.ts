import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class AnalyzeFairnessDto {
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsNotEmpty()
  @IsString()
  datasetArtifactId: string;

  @IsOptional()
  @IsString()
  modelArtifactId?: string;

  @IsOptional()
  @IsObject()
  columns?: {
    sensitive_attribute?: string;
    y_true?: string;
    y_pred?: string;
  };

  @IsOptional()
  @IsString()
  metricId?: string;
}


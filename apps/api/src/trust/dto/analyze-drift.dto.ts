import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class AnalyzeDriftDto {
  @IsString()
  projectId!: string;

  @IsString()
  baselineArtifactId!: string;

  @IsString()
  currentArtifactId!: string;

  @IsOptional()
  @IsArray()
  columns?: string[]; // numeric columns to compare

  @IsOptional()
  @IsObject()
  targets?: {
    y_true?: string;
    y_score?: string; // probability score for calibration
  };
}


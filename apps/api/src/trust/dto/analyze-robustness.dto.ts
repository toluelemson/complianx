import { IsObject, IsOptional, IsString } from 'class-validator';

export class AnalyzeRobustnessDto {
  @IsString()
  projectId!: string;

  @IsString()
  datasetArtifactId!: string;

  @IsOptional()
  @IsObject()
  columns?: {
    y_pred_baseline?: string; // e.g., y_pred
    y_pred_perturbed?: string; // e.g., y_pred_noisy
    y_score?: string; // probability score in [0,1]
  };
}


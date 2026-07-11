import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateMetricDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  pillar: string;

  @IsNotEmpty()
  @IsString()
  unit: string;

  @IsOptional()
  @IsNumber()
  targetMin?: number;

  @IsOptional()
  @IsNumber()
  targetMax?: number;

  @IsOptional()
  @IsString()
  datasetName?: string;

  @IsOptional()
  @IsString()
  modelName?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;
}

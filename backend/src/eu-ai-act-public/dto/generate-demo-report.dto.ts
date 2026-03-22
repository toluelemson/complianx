import { IsOptional, IsString } from 'class-validator';

export class GenerateDemoReportDto {
  @IsString()
  systemName!: string;

  @IsString()
  companyName!: string;

  @IsString()
  industry!: string;

  @IsString()
  useCase!: string;

  @IsString()
  inputData!: string;

  @IsString()
  outputDecision!: string;

  @IsString()
  stakeholders!: string;

  @IsString()
  operatorRole!: string;

  @IsString()
  geography!: string;

  @IsString()
  highRiskContext!: string;

  @IsString()
  oversightStatus!: string;

  @IsString()
  controlsStatus!: string;

  @IsString()
  documentationStatus!: string;

  @IsString()
  conformityStatus!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

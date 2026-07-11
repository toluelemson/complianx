import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ProjectWorkflowActionDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  expectedVersion?: number;

  @IsOptional()
  @IsUUID()
  reviewerId?: string;

  @IsOptional()
  @IsUUID()
  approverId?: string;
}

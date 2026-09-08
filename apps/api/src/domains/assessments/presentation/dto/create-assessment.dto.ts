import { IsOptional, IsString } from 'class-validator';

export class CreateAssessmentDto {
  @IsOptional()
  @IsString()
  packVersion?: string;
}

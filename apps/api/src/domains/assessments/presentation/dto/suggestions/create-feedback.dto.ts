import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  projectId: string;

  @IsString()
  sectionId: string;

  @IsString()
  fieldName: string;

  @IsString()
  suggestion: string;

  @IsBoolean()
  liked: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

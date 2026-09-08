import { IsObject } from 'class-validator';

export class UpdateAssessmentAnswersDto {
  @IsObject()
  answers!: Record<string, unknown>;
}

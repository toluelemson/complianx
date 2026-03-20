import { IsObject, IsOptional, IsString } from 'class-validator';

export class QuickAssessDto {
  @IsObject()
  answers!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  locale?: string;
}

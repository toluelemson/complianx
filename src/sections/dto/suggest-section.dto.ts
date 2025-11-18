import { IsObject, IsOptional, IsString } from 'class-validator';

export class SuggestSectionDto {
  @IsOptional()
  @IsObject()
  partialContent?: Record<string, any>;

  @IsOptional()
  @IsString()
  hint?: string;

  @IsOptional()
  @IsString()
  targetField?: string;
}

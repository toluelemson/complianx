import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

// Template transport contract owned by regulatory frameworks.

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsString()
  sectionName: string;

  @IsObject()
  content: Record<string, any>;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  shared?: boolean;
}

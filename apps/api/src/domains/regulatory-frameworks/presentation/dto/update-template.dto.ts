import { IsBoolean, IsOptional, IsString } from 'class-validator';

// Template transport contract owned by regulatory frameworks.

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  shared?: boolean;
}

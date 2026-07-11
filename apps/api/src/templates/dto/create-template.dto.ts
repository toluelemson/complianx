import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

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

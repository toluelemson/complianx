import { IsOptional, IsString } from 'class-validator';

export class CreatePublicSessionDto {
  @IsOptional()
  @IsString()
  packVersion?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  locale?: string;
}

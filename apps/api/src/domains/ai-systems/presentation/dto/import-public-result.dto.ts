import { IsOptional, IsString } from 'class-validator';

export class ImportPublicResultDto {
  @IsString()
  publicResultId!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

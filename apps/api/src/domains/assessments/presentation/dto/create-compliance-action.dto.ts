import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateComplianceActionDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

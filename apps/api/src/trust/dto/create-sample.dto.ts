import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSampleDto {
  @IsNotEmpty()
  @IsNumber()
  value: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  artifactId?: string;
}

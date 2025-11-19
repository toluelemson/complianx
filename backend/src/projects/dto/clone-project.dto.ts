import { IsOptional, IsString } from 'class-validator';

export class CloneProjectDto {
  @IsOptional()
  @IsString()
  name?: string;
}

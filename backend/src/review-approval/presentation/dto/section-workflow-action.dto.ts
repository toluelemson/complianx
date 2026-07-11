import { IsOptional, IsString } from 'class-validator';

export class SectionWorkflowActionDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  signature?: string;
}

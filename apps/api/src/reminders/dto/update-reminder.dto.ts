import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateReminderDto {
  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

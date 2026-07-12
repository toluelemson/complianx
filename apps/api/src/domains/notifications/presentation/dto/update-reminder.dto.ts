import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

// Reminder transport contract owned by the notifications domain.

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

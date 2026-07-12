import { IsDateString, IsString, MinLength } from 'class-validator';

// Reminder transport contract owned by the notifications domain.

export class CreateReminderDto {
  @IsString()
  @MinLength(3)
  message: string;

  @IsDateString()
  dueAt: string;
}

import { IsDateString, IsString, MinLength } from 'class-validator';

export class CreateReminderDto {
  @IsString()
  @MinLength(3)
  message: string;

  @IsDateString()
  dueAt: string;
}

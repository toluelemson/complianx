import { IsBoolean } from 'class-validator';

export class FinalizePublicSessionDto {
  @IsBoolean()
  confirmCompleteness!: boolean;
}

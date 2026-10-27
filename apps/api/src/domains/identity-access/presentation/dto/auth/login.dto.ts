import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  /** Account email address. */
  @IsEmail()
  email: string;

  /** Account password. */
  @IsString()
  password: string;
}

import { IsObject, IsString } from 'class-validator';

export class CreateSectionDto {
  @IsString()
  name: string;

  @IsObject()
  content: Record<string, any>;
}

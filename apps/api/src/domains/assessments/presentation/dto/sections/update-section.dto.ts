import { IsObject } from 'class-validator';

export class UpdateSectionDto {
  @IsObject()
  content: Record<string, any>;
}

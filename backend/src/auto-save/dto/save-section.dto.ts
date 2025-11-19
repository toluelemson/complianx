import { IsObject, IsString } from 'class-validator';

export class SaveSectionDto {
  @IsString()
  sectionId: string;

  @IsObject()
  content: Record<string, any>;
}

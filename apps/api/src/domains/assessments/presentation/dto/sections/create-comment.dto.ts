import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  body: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];

  @IsOptional()
  @IsString()
  linkedEntityType?: string;

  @IsOptional()
  @IsString()
  linkedEntityId?: string;
}

import { ArrayNotEmpty, IsArray, IsEnum } from 'class-validator';

// Template transport contract owned by regulatory frameworks.

export enum TemplateBulkAction {
  SHARE = 'share',
  UNSHARE = 'unshare',
  DELETE = 'delete',
}

export class BulkTemplateActionDto {
  @IsArray()
  @ArrayNotEmpty()
  templateIds!: string[];

  @IsEnum(TemplateBulkAction)
  action!: TemplateBulkAction;
}

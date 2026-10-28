import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class ReviewClassificationDto {
  @IsIn(['REVIEWED', 'OVERRIDDEN'])
  status!: 'REVIEWED' | 'OVERRIDDEN';

  @IsOptional()
  @IsString()
  @MinLength(2)
  overrideCategory?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;
}

import { IsOptional, IsString } from 'class-validator';

export class RequestReviewDto {
  @IsString()
  reviewerId!: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  approverId?: string;
}

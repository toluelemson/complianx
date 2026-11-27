import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const assessmentRowStates = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'SATISFIED',
  'NOT_APPLICABLE',
] as const;

export class UpdateAssessmentRequirementRowDto {
  @IsString()
  obligationId!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  score?: number | null;

  @IsOptional()
  @IsIn(assessmentRowStates)
  state?: (typeof assessmentRowStates)[number];

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  weight?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  rationale?: string | null;

  @IsOptional()
  @IsArray()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { each: true },
  )
  evidenceLinks?: string[];
}

export class UpdateAssessmentScoringDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  weightingChoice?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  targetBand?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateAssessmentRequirementRowDto)
  rows?: UpdateAssessmentRequirementRowDto[];
}

import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateAssessmentScoringDto } from './update-assessment-scoring.dto';

describe('UpdateAssessmentScoringDto', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });

  it('rejects an unsupported row state and invalid evidence link', async () => {
    const dto = {
      rows: [
        {
          obligationId: 'obligation-1',
          state: 'SKIPPED',
          evidenceLinks: ['not-a-url'],
        },
      ],
    };
    await expect(
      pipe.transform(dto, {
        type: 'body',
        metatype: UpdateAssessmentScoringDto,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

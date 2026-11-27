import { BadRequestException, ValidationPipe } from '@nestjs/common';
import {
  CreateDocumentationItemDto,
  CreateComplianceStakeholderDto,
  CreateSystemAssetDto,
  UpdateAssessmentContextDto,
  UpdateSystemAssetDto,
} from './traceability-model.dto';

describe('Traceability model DTOs', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });

  it('accepts a typed system asset', async () => {
    await expect(
      pipe.transform(
        { name: 'Decision model', assetType: 'MODEL', version: '2.1' },
        { type: 'body', metatype: CreateSystemAssetDto },
      ),
    ).resolves.toMatchObject({ assetType: 'MODEL' });
  });

  it('only accepts supported lifecycle stages for asset updates', async () => {
    await expect(
      pipe.transform(
        { lifecycleStage: 'LIVE' },
        { type: 'body', metatype: UpdateSystemAssetDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects non-HTTP documentation references', async () => {
    await expect(
      pipe.transform(
        {
          documentType: 'MONITORING_AND_TESTING',
          title: 'Validation report',
          referenceUrl: 'file:///private/report.pdf',
        },
        { type: 'body', metatype: CreateDocumentationItemDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('only accepts the supported assessor roles', async () => {
    await expect(
      pipe.transform(
        {
          assessorType: 'EXTERNAL_VENDOR',
          assessmentDate: '2026-10-31',
        },
        { type: 'body', metatype: UpdateAssessmentContextDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates stakeholder roles, country codes, and email addresses', async () => {
    await expect(
      pipe.transform(
        {
          role: 'NOTIFIED_BODY',
          name: 'Independent conformity body',
          country: 'EST',
          contactEmail: 'not-an-email',
        },
        { type: 'body', metatype: CreateComplianceStakeholderDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

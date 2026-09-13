import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateCompanyProfileDto } from './update-company-profile.dto';

describe('UpdateCompanyProfileDto', () => {
  const pipe = new ValidationPipe({ whitelist: true });
  const validate = (body: Record<string, unknown>) =>
    pipe.transform(body, { type: 'body', metatype: UpdateCompanyProfileDto });

  it.each(['', '   '])('accepts blank optional fields (%j)', async (blank) => {
    await expect(
      validate({ legalName: 'Example', website: blank, contactEmail: blank }),
    ).resolves.toBeDefined();
  });

  it('accepts omitted fields and valid padded values', async () => {
    await expect(validate({})).resolves.toBeDefined();
    await expect(
      validate({
        website: ' https://example.com ',
        contactEmail: ' contact@example.com ',
      }),
    ).resolves.toBeDefined();
  });

  it.each([
    { website: 'invalid' },
    { website: 'example.com' },
    { website: 123 },
    { contactEmail: 'invalid' },
    { contactEmail: [] },
  ])('rejects invalid nonempty input: %j', async (body) => {
    await expect(validate(body)).rejects.toBeInstanceOf(BadRequestException);
  });
});

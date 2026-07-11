import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('maps a valid token payload to the authenticated request user', async () => {
    const strategy = new JwtStrategy(
      new ConfigService({ JWT_SECRET: 'test-secret' }),
    );

    await expect(
      strategy.validate({
        sub: 'user-1',
        email: 'user@example.com',
        role: 'REVIEWER',
        defaultCompanyId: 'company-1',
        companies: [{ companyId: 'company-1', role: 'REVIEWER' }],
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        userId: 'user-1',
        email: 'user@example.com',
        role: 'REVIEWER',
        companyId: 'company-1',
      }),
    );
  });

  it('rejects startup when the JWT secret is missing', () => {
    expect(() => new JwtStrategy(new ConfigService())).toThrow(
      'JWT secret not configured',
    );
  });
});

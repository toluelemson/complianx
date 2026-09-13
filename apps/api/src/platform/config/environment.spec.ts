import { validateEnvironment } from './environment';

const productionEnvironment = () => ({
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://app:strong-password@database:5432/complianx',
  JWT_SECRET: 'a-production-secret-with-at-least-32-characters',
  FRONTEND_URL: 'https://app.neuraldocx.com',
  CORS_ORIGINS: 'https://app.neuraldocx.com',
  STORAGE_ROOT: '/data/neuraldocx',
  FILE_SCANNER_PROVIDER: 'clamav',
  CLAMAV_HOST: 'clamav',
  LLM_BASE_URL: 'https://api.openai.com',
  LLM_API_KEY: 'provider-key-value',
  LLM_MODEL: 'configured-model',
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '587',
  SMTP_USER: 'mailer',
  SMTP_PASS: 'smtp-password-value',
  EMAIL_FROM: 'Neuraldocx <mail@example.com>',
  MONETIZATION_ENABLED: 'true',
  STRIPE_SECRET_KEY: 'sk_live_value',
  STRIPE_WEBHOOK_SECRET: 'whsec_value',
  STRIPE_PRICE_PRO: 'price_pro',
  STRIPE_PRICE_ENTERPRISE: 'price_enterprise',
});

describe('production environment validation', () => {
  it('normalizes numeric security settings', () => {
    expect(validateEnvironment(productionEnvironment())).toMatchObject({
      API_BODY_LIMIT_BYTES: 1_048_576,
      UPLOAD_MAX_BYTES: 26_214_400,
      RATE_LIMIT_TTL_MS: 60_000,
      RATE_LIMIT_REQUESTS: 300,
      TRUST_PROXY_HOPS: 1,
      SMTP_PORT: 587,
    });
  });

  it.each([
    ['JWT_SECRET', 'change-me', 'placeholder'],
    ['JWT_SECRET', 'short', 'at least 32'],
    ['CORS_ORIGINS', '', 'required'],
    ['FRONTEND_URL', 'http://app.example.com', 'HTTPS'],
    ['STORAGE_ROOT', 'storage', 'absolute path'],
    ['FILE_SCANNER_PROVIDER', 'noop', 'requires FILE_SCANNER_PROVIDER=clamav'],
    ['LLM_API_KEY', '', 'required'],
    ['SMTP_PASS', '', 'required'],
    ['STRIPE_WEBHOOK_SECRET', '', 'required'],
  ])('rejects unsafe production %s configuration', (key, value, message) => {
    expect(() =>
      validateEnvironment({ ...productionEnvironment(), [key]: value }),
    ).toThrow(message);
  });

  it('allows Stripe settings to be absent when monetization is disabled', () => {
    const environment = productionEnvironment();
    environment.MONETIZATION_ENABLED = 'false';
    delete (environment as Partial<typeof environment>).STRIPE_SECRET_KEY;
    delete (environment as Partial<typeof environment>).STRIPE_WEBHOOK_SECRET;
    expect(() => validateEnvironment(environment)).not.toThrow();
  });

  it('keeps development services optional while validating configured limits', () => {
    expect(validateEnvironment({ NODE_ENV: 'development' })).toMatchObject({
      API_BODY_LIMIT_BYTES: 1_048_576,
      UPLOAD_MAX_BYTES: 26_214_400,
      FRONTEND_URL: 'http://localhost:5173',
      CORS_ORIGINS: 'http://localhost:5173',
    });
    expect(() =>
      validateEnvironment({ NODE_ENV: 'test', UPLOAD_MAX_BYTES: 'unlimited' }),
    ).toThrow('UPLOAD_MAX_BYTES must be an integer');
  });
});

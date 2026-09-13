import { isAbsolute } from 'node:path';

type Environment = Record<string, unknown>;

const PLACEHOLDERS =
  /^(change-me|changeme|secret|password|sk-your-api-key|whsec_\.\.\.|price_\.\.\.)$/i;

export function validateEnvironment(input: Environment): Environment {
  const environment = { ...input };
  const production = stringValue(environment, 'NODE_ENV') === 'production';

  integer(environment, 'PORT', 3000, 1, 65535);
  integer(environment, 'API_BODY_LIMIT_BYTES', 1_048_576, 1024, 10_485_760);
  integer(environment, 'UPLOAD_MAX_BYTES', 26_214_400, 1024, 104_857_600);
  integer(environment, 'RATE_LIMIT_TTL_MS', 60_000, 1000, 3_600_000);
  integer(environment, 'RATE_LIMIT_REQUESTS', 300, 1, 100_000);
  integer(environment, 'TRUST_PROXY_HOPS', production ? 1 : 0, 0, 10);

  if (!production) {
    environment.FRONTEND_URL =
      stringValue(environment, 'FRONTEND_URL') || 'http://localhost:5173';
    environment.CORS_ORIGINS =
      stringValue(environment, 'CORS_ORIGINS') || environment.FRONTEND_URL;
    return environment;
  }

  const databaseUrl = required(environment, 'DATABASE_URL');
  const database = validUrl('DATABASE_URL', databaseUrl, [
    'postgres:',
    'postgresql:',
  ]);
  if (!database.username || !database.password) {
    throw new Error(
      'DATABASE_URL must include production database credentials',
    );
  }
  if (PLACEHOLDERS.test(database.password)) {
    throw new Error('DATABASE_URL must not use placeholder credentials');
  }

  const jwtSecret = secureSecret(environment, 'JWT_SECRET');
  if (jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET must contain at least 32 characters in production',
    );
  }

  const frontendOrigins = origins(
    required(environment, 'FRONTEND_URL'),
    'FRONTEND_URL',
  );
  const corsOrigins = origins(
    required(environment, 'CORS_ORIGINS'),
    'CORS_ORIGINS',
  );
  for (const origin of [...frontendOrigins, ...corsOrigins]) {
    if (origin.protocol !== 'https:') {
      throw new Error(`${origin.href} must use HTTPS in production`);
    }
  }

  const storageRoot = required(environment, 'STORAGE_ROOT');
  if (!isAbsolute(storageRoot)) {
    throw new Error('STORAGE_ROOT must be an absolute path in production');
  }

  if (
    required(environment, 'FILE_SCANNER_PROVIDER').toLowerCase() !== 'clamav'
  ) {
    throw new Error('Production requires FILE_SCANNER_PROVIDER=clamav');
  }
  required(environment, 'CLAMAV_HOST');

  validUrl('LLM_BASE_URL', required(environment, 'LLM_BASE_URL'), ['https:']);
  secureSecret(environment, 'LLM_API_KEY');
  required(environment, 'LLM_MODEL');

  required(environment, 'SMTP_HOST');
  integer(environment, 'SMTP_PORT', undefined, 1, 65535);
  required(environment, 'SMTP_USER');
  secureSecret(environment, 'SMTP_PASS');
  requiredOneOf(environment, ['SMTP_FROM', 'EMAIL_FROM']);

  if (stringValue(environment, 'MONETIZATION_ENABLED') !== 'false') {
    secureSecret(environment, 'STRIPE_SECRET_KEY');
    secureSecret(environment, 'STRIPE_WEBHOOK_SECRET');
    secureSecret(environment, 'STRIPE_PRICE_PRO');
    secureSecret(environment, 'STRIPE_PRICE_ENTERPRISE');
  }

  return environment;
}

function stringValue(environment: Environment, key: string) {
  const value = environment[key];
  return typeof value === 'string' ? value.trim() : '';
}

function required(environment: Environment, key: string) {
  const value = stringValue(environment, key);
  if (!value) throw new Error(`${key} is required in production`);
  return value;
}

function requiredOneOf(environment: Environment, keys: string[]) {
  const value = keys.map((key) => stringValue(environment, key)).find(Boolean);
  if (!value) throw new Error(`${keys.join(' or ')} is required in production`);
  return value;
}

function secureSecret(environment: Environment, key: string) {
  const value = required(environment, key);
  if (PLACEHOLDERS.test(value) || value.includes('...')) {
    throw new Error(`${key} must not use a placeholder value in production`);
  }
  return value;
}

function integer(
  environment: Environment,
  key: string,
  fallback: number | undefined,
  minimum: number,
  maximum: number,
) {
  const configured = stringValue(environment, key);
  if (!configured && fallback === undefined) {
    throw new Error(`${key} is required in production`);
  }
  const value = configured ? Number(configured) : fallback!;
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `${key} must be an integer between ${minimum} and ${maximum}`,
    );
  }
  environment[key] = value;
  return value;
}

function validUrl(key: string, value: string, protocols: string[]) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${key} must be a valid URL`);
  }
  if (!protocols.includes(url.protocol)) {
    throw new Error(`${key} must use ${protocols.join(' or ')}`);
  }
  return url;
}

function origins(value: string, key: string) {
  return value.split(',').map((entry) => {
    const url = validUrl(key, entry.trim(), ['http:', 'https:']);
    if (url.pathname !== '/' || url.search || url.hash) {
      throw new Error(`${key} entries must be origins without paths`);
    }
    return url;
  });
}

import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NoopFileScanner,
  type FileScanner,
} from '../application/artifacts/file-scanner';
import { ClamAvFileScanner } from './clamav-file-scanner';

export const FILE_SCANNER = 'FILE_SCANNER';

type ScannerEnvironment = Partial<
  Pick<
    NodeJS.ProcessEnv,
    | 'NODE_ENV'
    | 'FILE_SCANNER_PROVIDER'
    | 'CLAMAV_HOST'
    | 'CLAMAV_PORT'
    | 'CLAMAV_TIMEOUT_MS'
  >
>;

export function createFileScanner(
  environment: ScannerEnvironment,
): FileScanner {
  const production = environment.NODE_ENV === 'production';
  const provider =
    environment.FILE_SCANNER_PROVIDER?.trim().toLowerCase() ||
    (production ? '' : 'noop');

  if (provider === 'noop') {
    if (production) {
      throw new Error(
        'FILE_SCANNER_PROVIDER=noop is not allowed in production',
      );
    }
    return new NoopFileScanner();
  }
  if (provider !== 'clamav') {
    throw new Error(
      production
        ? 'Production requires FILE_SCANNER_PROVIDER=clamav'
        : `Unsupported FILE_SCANNER_PROVIDER: ${provider || '(empty)'}`,
    );
  }

  const host = environment.CLAMAV_HOST?.trim();
  const port = Number(environment.CLAMAV_PORT ?? '3310');
  const timeoutMs = Number(environment.CLAMAV_TIMEOUT_MS ?? '10000');
  if (!host)
    throw new Error(
      'CLAMAV_HOST is required when FILE_SCANNER_PROVIDER=clamav',
    );
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('CLAMAV_PORT must be an integer between 1 and 65535');
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) {
    throw new Error('CLAMAV_TIMEOUT_MS must be a positive number');
  }
  return new ClamAvFileScanner({ host, port, timeoutMs });
}

export const fileScannerProvider: Provider = {
  provide: FILE_SCANNER,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    createFileScanner({
      NODE_ENV: config.get<string>('NODE_ENV'),
      FILE_SCANNER_PROVIDER: config.get<string>('FILE_SCANNER_PROVIDER'),
      CLAMAV_HOST: config.get<string>('CLAMAV_HOST'),
      CLAMAV_PORT: config.get<string>('CLAMAV_PORT'),
      CLAMAV_TIMEOUT_MS: config.get<string>('CLAMAV_TIMEOUT_MS'),
    }),
};

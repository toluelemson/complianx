import { NoopFileScanner } from '../application/artifacts/file-scanner';
import { ClamAvFileScanner } from './clamav-file-scanner';
import { createFileScanner } from './file-scanner.provider';

describe('createFileScanner', () => {
  it('uses the no-op scanner in development when explicitly configured', () => {
    expect(
      createFileScanner({
        NODE_ENV: 'development',
        FILE_SCANNER_PROVIDER: 'noop',
      }),
    ).toBeInstanceOf(NoopFileScanner);
  });

  it('defaults to the no-op scanner outside production', () => {
    expect(createFileScanner({ NODE_ENV: 'test' })).toBeInstanceOf(
      NoopFileScanner,
    );
  });

  it('creates ClamAV scanner from valid configuration', () => {
    expect(
      createFileScanner({
        NODE_ENV: 'production',
        FILE_SCANNER_PROVIDER: 'clamav',
        CLAMAV_HOST: 'clamav',
      }),
    ).toBeInstanceOf(ClamAvFileScanner);
  });

  it.each([
    [
      { NODE_ENV: 'production' },
      'Production requires FILE_SCANNER_PROVIDER=clamav',
    ],
    [
      { NODE_ENV: 'production', FILE_SCANNER_PROVIDER: 'noop' },
      'FILE_SCANNER_PROVIDER=noop is not allowed in production',
    ],
    [
      { NODE_ENV: 'production', FILE_SCANNER_PROVIDER: 'clamav' },
      'CLAMAV_HOST is required',
    ],
  ])('rejects incorrect production configuration', (environment, message) => {
    expect(() => createFileScanner(environment)).toThrow(message);
  });
});

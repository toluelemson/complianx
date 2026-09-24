import { execFileSync } from 'node:child_process';
import path from 'node:path';

const repositoryRoot = path.resolve(__dirname, '..');

function runPnpm(args: string[], environment: NodeJS.ProcessEnv) {
  execFileSync('corepack', ['pnpm', ...args], {
    cwd: repositoryRoot,
    env: environment,
    stdio: 'inherit',
  });
}

export default function globalSetup() {
  const databaseUrl = process.env.E2E_DATABASE_URL;
  if (!databaseUrl?.includes('_test')) {
    throw new Error('E2E_DATABASE_URL must use a dedicated *_test database.');
  }

  const environment = { ...process.env, DATABASE_URL: databaseUrl };
  runPnpm(
    ['--filter', 'api', 'exec', 'prisma', 'migrate', 'deploy'],
    environment,
  );
  runPnpm(['--filter', 'api', 'seed:eu-ai-act'], environment);
  runPnpm(
    [
      '--filter',
      'api',
      'exec',
      'ts-node',
      '-r',
      'ts-node/register',
      'test/e2e/prepare-fixtures.ts',
    ],
    environment,
  );
}

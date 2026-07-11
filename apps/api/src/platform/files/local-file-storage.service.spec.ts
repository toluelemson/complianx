import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { LocalFileStorageService } from './local-file-storage.service';

describe('LocalFileStorageService', () => {
  let root: string;
  let previousRoot: string | undefined;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'complianx-files-'));
    previousRoot = process.env.STORAGE_ROOT;
    process.env.STORAGE_ROOT = root;
  });

  afterEach(async () => {
    if (previousRoot === undefined) {
      delete process.env.STORAGE_ROOT;
    } else {
      process.env.STORAGE_ROOT = previousRoot;
    }
    await rm(root, { recursive: true, force: true });
  });

  it('writes, resolves, and removes files within a bucket', async () => {
    const storage = new LocalFileStorageService();

    await storage.write('artifacts', 'evidence.txt', Buffer.from('evidence'));

    expect(storage.exists('artifacts', 'evidence.txt')).toBe(true);
    expect(
      await readFile(storage.resolve('artifacts', 'evidence.txt'), 'utf8'),
    ).toBe('evidence');

    await storage.remove('artifacts', 'evidence.txt');
    expect(storage.exists('artifacts', 'evidence.txt')).toBe(false);
  });
});
